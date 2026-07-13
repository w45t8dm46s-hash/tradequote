import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { getApiBaseUrl, parseJsonResponse } from "@/lib/api";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
}

interface CustomersContextValue {
  customers: Customer[];
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
  loading: boolean;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);
const ENTITY_TYPE = "customers";

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const loadCustomers = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rows = await parseJsonResponse<{ id: string; payload: Customer }[]>(response);
      const next = rows.map((row) => row.payload).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setCustomers(next);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const syncRecord = useCallback(async (record: Customer) => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to save customer");
    }
    await loadCustomers();
  }, [getToken, loadCustomers]);

  const addCustomer = useCallback(async (c: Customer) => {
    setCustomers((prev) => [c, ...prev]);
    await syncRecord(c);
  }, [syncRecord]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
    const existing = customers.find((c) => c.id === id);
    if (existing) {
      await syncRecord({ ...existing, ...updates });
    }
  }, [customers, syncRecord]);

  const deleteCustomer = useCallback(async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to delete customer");
    }
    await loadCustomers();
  }, [getToken, loadCustomers]);

  const getCustomer = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  return (
    <CustomersContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, getCustomer, loading }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomers must be used within CustomersProvider");
  return ctx;
}
