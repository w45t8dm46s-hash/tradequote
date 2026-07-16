import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";

import { fetchWithRetry, getApiBaseUrl, parseJsonResponse } from "@/lib/api";

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
  reloadCustomers: () => Promise<void>;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);
const ENTITY_TYPE = "customers";

function upsertCustomer(list: Customer[], customer: Customer) {
  const without = list.filter((c) => c.id !== customer.id);
  return [customer, ...without].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    if (!token && isSignedIn) {
      throw new Error("Login is still loading. Please try again.");
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken, isSignedIn]);

  const loadCustomers = useCallback(async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setCustomers([]);
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

      const rows = await parseJsonResponse<{ id: string; payload: Customer }[]>(response);
      const next = rows
        .map((row) => row.payload)
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      setCustomers(next);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const syncRecord = useCallback(async (record: Customer) => {
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
    setCustomers((prev) => upsertCustomer(prev, record));
  }, [getAuthHeaders, isSignedIn]);

  const addCustomer = useCallback(async (customer: Customer) => {
    await syncRecord(customer);
  }, [syncRecord]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const existing = customers.find((c) => c.id === id);
    if (!existing) throw new Error("Customer is still loading. Please try again.");

    const next = { ...existing, ...updates };
    await syncRecord(next);
  }, [customers, syncRecord]);

  const deleteCustomer = useCallback(async (id: string) => {
    if (!isSignedIn) throw new Error("You are not signed in.");

    const response = await fetchWithRetry(async () => {
      const headers = await getAuthHeaders();
      return fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
        method: "DELETE",
        headers,
      });
    });

    await parseJsonResponse(response);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, [getAuthHeaders, isSignedIn]);

  const getCustomer = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);

  return (
    <CustomersContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, getCustomer, loading, reloadCustomers: loadCustomers }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error("useCustomers must be used within CustomersProvider");
  return ctx;
}
