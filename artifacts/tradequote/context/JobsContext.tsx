import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { getApiBaseUrl, parseJsonResponse } from "@/lib/api";

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
const ENTITY_TYPE = "jobs";

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const loadJobs = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rows = await parseJsonResponse<{ id: string; payload: Job }[]>(response);
      const next = rows.map((row) => row.payload).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setJobs(next);
    } catch (error) {
      console.error("Failed to load jobs", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const syncRecord = useCallback(async (record: Job) => {
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to save job");
    }
    await loadJobs();
  }, [getToken, loadJobs]);

  const addJob = useCallback(async (j: Job) => {
    await syncRecord(j);
  }, [syncRecord]);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, ...updates } : j));
    const existing = jobs.find((j) => j.id === id);
    if (existing) {
      await syncRecord({ ...existing, ...updates });
    }
  }, [jobs, syncRecord]);

  const deleteJob = useCallback(async (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    const token = await getToken();
    const response = await fetch(`${getApiBaseUrl()}/api/me/records/${ENTITY_TYPE}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as any).error || "Failed to delete job");
    }
    await loadJobs();
  }, [getToken, loadJobs]);

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
