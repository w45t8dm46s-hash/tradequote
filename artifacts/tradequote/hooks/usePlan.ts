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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [quoteCount, setQuoteCount] = useState<number | null>(null);
  const [quoteLimit, setQuoteLimit] = useState<number | null>(null);
  const [quotesRemaining, setQuotesRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const reload = useCallback(async (): Promise<boolean> => {
    if (!isLoaded) {
      return false;
    }

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
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/me?t=${Date.now()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Cache-Control": "no-cache",
        },
      });

      const data = (await response.json().catch(() => ({}))) as MeResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data?.error || "Could not load plan details.");
      }

      const pro = Boolean(data.isPro);

      setIsPro(pro);
      setQuoteCount(typeof data.quoteCount === "number" ? data.quoteCount : null);
      setQuoteLimit(typeof data.quoteLimit === "number" ? data.quoteLimit : null);
      setQuotesRemaining(typeof data.quotesRemaining === "number" ? data.quotesRemaining : null);
      setLastLoadedAt(Date.now());

      return pro;
    } catch (e: any) {
      setError(e?.message || "Could not load plan details.");
      setIsPro(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!isSignedIn) return;

    const refresh = () => {
      void reload();
    };

    const interval = setInterval(refresh, 30000);

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
          clearInterval(interval);
          window.removeEventListener("focus", refresh);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };
      }

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", refresh);
      };
    }

    return () => {
      clearInterval(interval);
    };
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
