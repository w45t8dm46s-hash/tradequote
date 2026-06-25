import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type JobStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  ordered: boolean;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  quoteId?: string;
  durationDays?: number;
  title: string;
  jobType: string;
  jobTypeLabel: string;
  status: JobStatus;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  notes: string;
  materials: Material[];
  createdAt: string;
}

interface JobsContextValue {
  jobs: Job[];
  addJob: (job: Job) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  getJob: (id: string) => Job | undefined;
  loading: boolean;
}

const JobsContext = createContext<JobsContextValue | null>(null);
const STORAGE_KEY = "@tradequote_jobs";

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((d) => d && setJobs(JSON.parse(d)))
      .finally(() => setLoading(false));
  }, []);

  const save = (list: Job[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  const addJob = useCallback(async (j: Job) => {
    setJobs((prev) => { const next = [j, ...prev]; save(next); return next; });
  }, []);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    setJobs((prev) => { const next = prev.map((j) => j.id === id ? { ...j, ...updates } : j); save(next); return next; });
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setJobs((prev) => { const next = prev.filter((j) => j.id !== id); save(next); return next; });
  }, []);

  const getJob = useCallback((id: string) => jobs.find((j) => j.id === id), [jobs]);

  return (
    <JobsContext.Provider value={{ jobs, addJob, updateJob, deleteJob, getJob, loading }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within JobsProvider");
  return ctx;
}
