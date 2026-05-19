import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

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
const STORAGE_KEY = "@tradequote_expenses";

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((d) => d && setExpenses(JSON.parse(d)))
      .finally(() => setLoading(false));
  }, []);

  const save = (list: Expense[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  const addExpense = useCallback(async (e: Expense) => {
    setExpenses((prev) => { const next = [e, ...prev]; save(next); return next; });
  }, []);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) => { const next = prev.map((e) => e.id === id ? { ...e, ...updates } : e); save(next); return next; });
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses((prev) => { const next = prev.filter((e) => e.id !== id); save(next); return next; });
  }, []);

  const getExpense = useCallback((id: string) => expenses.find((e) => e.id === id), [expenses]);

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
