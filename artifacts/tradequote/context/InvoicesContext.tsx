import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type LineItem } from "./QuotesContext";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "partial";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  quoteId?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  paidAmount: number;
  depositAmount: number;
  notes: string;
}

interface InvoicesContextValue {
  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  getInvoice: (id: string) => Invoice | undefined;
  loading: boolean;
}

const InvoicesContext = createContext<InvoicesContextValue | null>(null);
const STORAGE_KEY = "@tradequote_invoices";

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((d) => d && setInvoices(JSON.parse(d)))
      .finally(() => setLoading(false));
  }, []);

  const save = (list: Invoice[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  const addInvoice = useCallback(async (inv: Invoice) => {
    setInvoices((prev) => { const next = [inv, ...prev]; save(next); return next; });
  }, []);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => { const next = prev.map((i) => i.id === id ? { ...i, ...updates } : i); save(next); return next; });
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices((prev) => { const next = prev.filter((i) => i.id !== id); save(next); return next; });
  }, []);

  const getInvoice = useCallback((id: string) => invoices.find((i) => i.id === id), [invoices]);

  return (
    <InvoicesContext.Provider value={{ invoices, addInvoice, updateInvoice, deleteInvoice, getInvoice, loading }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error("useInvoices must be used within InvoicesProvider");
  return ctx;
}
