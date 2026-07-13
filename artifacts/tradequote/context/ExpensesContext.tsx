import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { getApiBaseUrl, parseJsonResponse } from "@/lib/api";

export const EXPENSE_CATEGORIES = [
  "Materials",
  "Tools & Equipment",
  "Fuel & Transport",
  "Subcontractors",
  "Insurance",
  "Marketing",
  "Office & Admin",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  jobId?: string;
  notes: string;
  createdAt: string;
}

interface ExpensesContextValue {
  expenses: Expense[];
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpense: (id: string) => Expense | undefined;
  loading: boolean;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);
const ENTITY_TYPE = "expenses";

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const loadExpenses = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const rows = await parseJsonResponse<{ id: string; payload: Expense }[]>(response);
      const next = rows
        .map((row) => row.payload)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      setExpenses(next);
    } catch (error) {
      console.error("Failed to load expenses", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const syncRecord = useCallback(async (record: Expense) => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to save expense");
    }

    await loadExpenses();
  }, [getToken, loadExpenses]);

  const addExpense = useCallback(async (expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
    await syncRecord(expense);
  }, [syncRecord]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => prev.map((expense) => expense.id === id ? { ...expense, ...updates } : expense));

    const existing = expenses.find((expense) => expense.id === id);
    if (existing) {
      await syncRecord({ ...existing, ...updates });
    }
  }, [expenses, syncRecord]);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));

    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to delete expense");
    }

    await loadExpenses();
  }, [getToken, loadExpenses]);

  const getExpense = useCallback((id: string) => expenses.find((expense) => expense.id === id), [expenses]);

  return (
    <ExpensesContext.Provider value={{ expenses, addExpense, updateExpense, deleteExpense, getExpense, loading }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within ExpensesProvider");
  return ctx;
}
