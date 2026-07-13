import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { getApiBaseUrl, parseJsonResponse } from "@/lib/api";
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
const ENTITY_TYPE = "invoices";

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const loadInvoices = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rows = await parseJsonResponse<{ id: string; payload: Invoice }[]>(response);
      const next = rows.map((row) => row.payload).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setInvoices(next);
    } catch (error) {
      console.error("Failed to load invoices", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const syncRecord = useCallback(async (record: Invoice) => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to save invoice");
    }
    await loadInvoices();
  }, [getToken, loadInvoices]);

  const addInvoice = useCallback(async (inv: Invoice) => {
    await syncRecord(inv);
  }, [syncRecord]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, ...updates } : i));
    const existing = invoices.find((i) => i.id === id);
    if (existing) {
      await syncRecord({ ...existing, ...updates });
    }
  }, [invoices, syncRecord]);

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to delete invoice");
    }
    await loadInvoices();
  }, [getToken, loadInvoices]);

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
