import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
const STORAGE_KEY = "@tradequote_customers";

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((d) => d && setCustomers(JSON.parse(d)))
      .finally(() => setLoading(false));
  }, []);

  const save = (list: Customer[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  const addCustomer = useCallback(async (c: Customer) => {
    setCustomers((prev) => { const next = [c, ...prev]; save(next); return next; });
  }, []);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => { const next = prev.map((c) => c.id === id ? { ...c, ...updates } : c); save(next); return next; });
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setCustomers((prev) => { const next = prev.filter((c) => c.id !== id); save(next); return next; });
  }, []);

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
