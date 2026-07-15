import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";

import { getApiBaseUrl } from "@/lib/api";

type MeResponse = {
  isPro?: boolean;
  quoteCount?: number;
  quoteLimit?: number;
  quotesRemaining?: number | null;
};

export function usePlan() {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [quoteCount, setQuoteCount] = useState<number | null>(null);
  const [quoteLimit, setQuoteLimit] = useState<number | null>(null);
  const [quotesRemaining, setQuotesRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!isSignedIn) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = (await response.json().catch(() => ({}))) as MeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data?.error || "Could not load plan details.");
      }

      setIsPro(Boolean(data.isPro));
      setQuoteCount(typeof data.quoteCount === "number" ? data.quoteCount : null);
      setQuoteLimit(typeof data.quoteLimit === "number" ? data.quoteLimit : null);
      setQuotesRemaining(typeof data.quotesRemaining === "number" ? data.quotesRemaining : null);
    } catch (e: any) {
      setError(e?.message || "Could not load plan details.");
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    isPro,
    quoteCount,
    quoteLimit,
    quotesRemaining,
    error,
    reload,
  };
}
