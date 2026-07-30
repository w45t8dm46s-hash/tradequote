import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchWithRetry, getApiBaseUrl, parseJsonResponse } from "@/lib/api";

type MeResponse = {
  isPro?: boolean;
  quoteCount?: number;
  quoteLimit?: number;
  quotesRemaining?: number | null;
};

export function usePlan() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const didInitialLoadRef = useRef(false);
  const isProRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [quoteCount, setQuoteCount] = useState<number | null>(null);
  const [quoteLimit, setQuoteLimit] = useState<number | null>(null);
  const [quotesRemaining, setQuotesRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const reload = useCallback(async (): Promise<boolean> => {
    if (!isLoaded) return isProRef.current;

    if (!isSignedIn) {
      isProRef.current = false;
      setIsPro(false);
      setQuoteCount(null);
      setQuoteLimit(null);
      setQuotesRemaining(null);
      setLoading(false);
      return false;
    }

    setError("");

    try {
      const response = await fetchWithRetry(async () => {
        const token = await getToken();
        return fetch(`${getApiBaseUrl()}/api/me?t=${Date.now()}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Cache-Control": "no-cache",
          },
        });
      }, { retries: 1, delayMs: 800 });

      const data = await parseJsonResponse<MeResponse & { error?: string }>(response);
      const pro = Boolean(data.isPro);

      isProRef.current = pro;
      setIsPro(pro);
      setQuoteCount(typeof data.quoteCount === "number" ? data.quoteCount : null);
      setQuoteLimit(typeof data.quoteLimit === "number" ? data.quoteLimit : null);
      setQuotesRemaining(typeof data.quotesRemaining === "number" ? data.quotesRemaining : null);
      setLastLoadedAt(Date.now());

      return pro;
    } catch (e: any) {
      setError(e?.message || "Could not load plan details.");
      return isProRef.current;
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      didInitialLoadRef.current = false;
      return;
    }

    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    void reload();
  }, [isLoaded, isSignedIn, reload]);

  return {
    loading,
    isPro,
    quoteCount,
    quoteLimit,
    quotesRemaining,
    error,
    lastLoadedAt,
    reload,
  };
}
