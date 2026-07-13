import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { getApiBaseUrl, parseJsonResponse } from "@/lib/api";

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
}

const QuotesContext = createContext<QuotesContextValue | null>(null);
const ENTITY_TYPE = "quotes";

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const loadQuotes = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rows = await parseJsonResponse<{ id: string; payload: Quote }[]>(response);
      const next = rows.map((row) => row.payload).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setQuotes(next);
    } catch (error) {
      console.error("Failed to load quotes", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  const syncRecord = useCallback(async (record: Quote) => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to save quote");
    }
    await loadQuotes();
  }, [getToken, loadQuotes]);

  const addQuote = useCallback(async (quote: Quote) => {
    await syncRecord(quote);
  }, [syncRecord]);

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
    setQuotes((prev) => prev.map((q) => q.id === id ? { ...q, ...updates } : q));
    const existing = quotes.find((q) => q.id === id);
    if (existing) {
      await syncRecord({ ...existing, ...updates });
    }
  }, [quotes, syncRecord]);

  const deleteQuote = useCallback(async (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to delete quote");
    }
    await loadQuotes();
  }, [getToken, loadQuotes]);

  const getQuote = useCallback((id: string) => quotes.find((q) => q.id === id), [quotes]);

  return (
    <QuotesContext.Provider value={{ quotes, addQuote, updateQuote, deleteQuote, getQuote, loading }}>
      {children}
    </QuotesContext.Provider>
  );
}

export function useQuotes() {
  const ctx = useContext(QuotesContext);
  if (!ctx) throw new Error("useQuotes must be used within QuotesProvider");
  return ctx;
}
