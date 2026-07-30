import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/expo";

import { fetchWithRetry, getApiBaseUrl, parseJsonResponse } from "@/lib/api";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface Quote {
  id: string;
  jobType: string;
  jobTypeLabel: string;
  customerName: string;
  customerAddress: string;
  customerId?: string;
  description: string;
  measurements: string;
  notes: string;
  photos: string[];
  status: QuoteStatus;
  createdAt: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  professionalSummary: string;
  customerSummary: string;
  validDays: number;
  quoteNumber: string;
}

interface QuotesContextValue {
  quotes: Quote[];
  addQuote: (quote: Quote) => Promise<void>;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  getQuote: (id: string) => Quote | undefined;
  loading: boolean;
  reloadQuotes: () => Promise<void>;
}

const QuotesContext = createContext<QuotesContextValue | null>(null);
const ENTITY_TYPE = "quotes";

function upsertQuote(list: Quote[], quote: Quote) {
  const without = list.filter((q) => q.id !== quote.id);
  return [quote, ...without].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const didInitialLoadRef = useRef(false);
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    if (!token && isSignedIn) {
      throw new Error("Login is still loading. Please try again.");
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken, isSignedIn]);

  const loadQuotes = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetchWithRetry(async () => {
        const headers = await getAuthHeaders();
        return fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}?t=${Date.now()}`, {
          headers: { ...headers, "Cache-Control": "no-cache" },
        });
      });

      const rows = await parseJsonResponse<{ id: string; payload: Quote }[]>(response);
      const next = rows
        .map((row) => row.payload)
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      setQuotes(next);
    } catch (error) {
      console.error("Failed to load quotes", error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      const hadLoaded = didInitialLoadRef.current;
      didInitialLoadRef.current = false;
      if (hadLoaded) setQuotes([]);
      setLoading(false);
      return;
    }

    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    void loadQuotes();
  }, [isLoaded, isSignedIn, loadQuotes]);

  const syncRecord = useCallback(async (record: Quote) => {
    if (!isSignedIn) throw new Error("You are not signed in.");

    const response = await fetchWithRetry(async () => {
      const headers = await getAuthHeaders();
      return fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(record),
      });
    });

    await parseJsonResponse(response);
    setQuotes((prev) => upsertQuote(prev, record));
  }, [getAuthHeaders, isSignedIn]);

  const addQuote = useCallback(async (quote: Quote) => {
    await syncRecord(quote);
  }, [syncRecord]);

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
    const existing = quotes.find((q) => q.id === id);
    if (!existing) throw new Error("Quote is still loading. Please try again.");

    const next = { ...existing, ...updates };
    await syncRecord(next);
  }, [quotes, syncRecord]);

  const deleteQuote = useCallback(async (id: string) => {
    if (!isSignedIn) throw new Error("You are not signed in.");

    const response = await fetchWithRetry(async () => {
      const headers = await getAuthHeaders();
      return fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
        method: "DELETE",
        headers,
      });
    });

    await parseJsonResponse(response);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }, [getAuthHeaders, isSignedIn]);

  const getQuote = useCallback((id: string) => quotes.find((q) => q.id === id), [quotes]);

  return (
    <QuotesContext.Provider value={{ quotes, addQuote, updateQuote, deleteQuote, getQuote, loading, reloadQuotes: loadQuotes }}>
      {children}
    </QuotesContext.Provider>
  );
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used within QuotesProvider");
  return ctx;
}
