import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry, getApiBaseUrl, parseJsonResponse } from "@/lib/api";

type MeResponse = {
  isPro?: boolean;
  quoteCount?: number;
  quoteLimit?: number;
  quotesRemaining?: number | null;
};

export function usePlan() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [quoteCount, setQuoteCount] = useState<number | null>(null);
  const [quoteLimit, setQuoteLimit] = useState<number | null>(null);
  const [quotesRemaining, setQuotesRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const reload = useCallback(async (): Promise<boolean> => {
    if (!isLoaded) return false;

    if (!isSignedIn) {
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
      });

      const data = await parseJsonResponse<MeResponse & { error?: string }>(response);
      const pro = Boolean(data.isPro);

      setIsPro(pro);
      setQuoteCount(typeof data.quoteCount === "number" ? data.quoteCount : null);
      setQuoteLimit(typeof data.quoteLimit === "number" ? data.quoteLimit : null);
      setQuotesRemaining(typeof data.quotesRemaining === "number" ? data.quotesRemaining : null);
      setLastLoadedAt(Date.now());

      return pro;
    } catch (e: any) {
      setError(e?.message || "Could not load plan details.");
      return isPro;
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, isPro]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isSignedIn) return;

    const refresh = () => {
      void reload();
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("focus", refresh);

      const onVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          refresh();
        }
      };

      if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
          window.removeEventListener("focus", refresh);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };
      }

      return () => {
        window.removeEventListener("focus", refresh);
      };
    }
  }, [isSignedIn, reload]);

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
