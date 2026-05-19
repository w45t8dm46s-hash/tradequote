import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

export interface LineItem {
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
const STORAGE_KEY = "@tradequote_quotes";

export function QuotesProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setQuotes(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load quotes", e);
    } finally {
      setLoading(false);
    }
  };

  const saveQuotes = async (updated: Quote[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addQuote = useCallback(async (quote: Quote) => {
    setQuotes((prev) => { const updated = [quote, ...prev]; saveQuotes(updated); return updated; });
  }, []);

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
    setQuotes((prev) => { const updated = prev.map((q) => q.id === id ? { ...q, ...updates } : q); saveQuotes(updated); return updated; });
  }, []);

  const deleteQuote = useCallback(async (id: string) => {
    setQuotes((prev) => { const updated = prev.filter((q) => q.id !== id); saveQuotes(updated); return updated; });
  }, []);

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
