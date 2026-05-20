import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
      if (stored) {
        const parsed: Quote[] = JSON.parse(stored);
        const seen = new Set<string>();
        const deduped = parsed.filter((q) => {
          if (seen.has(q.id)) return false;
          seen.add(q.id);
          return true;
        });
        setQuotes(deduped);
        if (deduped.length !== parsed.length) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(deduped)).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Failed to load quotes", e);
    } finally {
      setLoading(false);
    }
  };

  const quotesRef = useRef<Quote[]>([]);
  useEffect(() => { quotesRef.current = quotes; }, [quotes]);
  const mutationChain = useRef<Promise<void>>(Promise.resolve());

  const stripHeavyPhotos = (q: Quote): Quote => ({
    ...q,
    photos: (q.photos ?? []).map((p) => (typeof p === "string" && p.startsWith("data:") ? "" : p)).filter(Boolean),
  });

  const isQuotaError = (e: any): boolean => {
    if (!e) return false;
    const name = String(e?.name ?? "");
    const msg = String(e?.message ?? "");
    return name === "QuotaExceededError" || /quota|exceed|storage/i.test(msg);
  };

  const trySave = async (list: Quote[]): Promise<Quote[]> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    } catch (e) {
      if (!isQuotaError(e)) {
        console.error("Failed to persist quotes", e);
        throw new Error("Failed to save quote. Please try again.");
      }
      const lighter = list.map(stripHeavyPhotos);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lighter));
        return lighter;
      } catch (e2) {
        console.error("Failed to persist quotes (after stripping photos)", e2);
        throw new Error("Your device storage is full. Please delete some old quotes and try again.");
      }
    }
  };

  const enqueueMutation = useCallback(<T,>(fn: (current: Quote[]) => Quote[]): Promise<void> => {
    const run = async () => {
      const next = fn(quotesRef.current);
      const saved = await trySave(next);
      quotesRef.current = saved;
      setQuotes(saved);
    };
    const result = mutationChain.current.then(run, run);
    mutationChain.current = result.catch(() => {});
    return result;
  }, []);

  const addQuote = useCallback((quote: Quote) =>
    enqueueMutation((cur) => {
      const idx = cur.findIndex((q) => q.id === quote.id);
      if (idx >= 0) {
        const next = [...cur];
        next[idx] = quote;
        return next;
      }
      return [quote, ...cur];
    }), [enqueueMutation]);

  const updateQuote = useCallback((id: string, updates: Partial<Quote>) =>
    enqueueMutation((cur) => cur.map((q) => q.id === id ? { ...q, ...updates } : q)), [enqueueMutation]);

  const deleteQuote = useCallback((id: string) =>
    enqueueMutation((cur) => cur.filter((q) => q.id !== id)), [enqueueMutation]);

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
