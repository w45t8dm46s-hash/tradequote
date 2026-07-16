import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  if (process.env.VITE_API_URL) return (process.env.VITE_API_URL as string).replace(/\/$/, "");

  if (Platform.OS !== "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}`;
    return "";
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const host = window.location.hostname;
    if (host === "quoteforge.uk" || host === "www.quoteforge.uk") {
      return "https://quoteforge-api-9fzw.onrender.com";
    }
    return window.location.origin;
  }

  return "";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryResponse(resp: Response): boolean {
  return resp.status === 401 || resp.status === 408 || resp.status === 429 || resp.status >= 500;
}

export async function fetchWithRetry(
  makeRequest: () => Promise<Response>,
  options: { retries?: number; delayMs?: number } = {},
): Promise<Response> {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 700;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const resp = await makeRequest();

      if (attempt < retries && shouldRetryResponse(resp)) {
        await wait(delayMs * (attempt + 1));
        continue;
      }

      return resp;
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await wait(delayMs * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export async function parseJsonResponse<T = unknown>(resp: Response): Promise<T> {
  const contentType = resp.headers.get("content-type") ?? "";
  const text = await resp.text().catch(() => "");

  if (!text) {
    if (!resp.ok) {
      throw new Error(`API request failed (${resp.status} ${resp.statusText})`);
    }
    return {} as T;
  }

  if (!contentType.includes("application/json")) {
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `API returned non-JSON response (${resp.status} ${resp.statusText}). ` +
      `Check that EXPO_PUBLIC_API_URL points to the correct API server. ` +
      `Body preview: ${preview}`
    );
  }

  const data = JSON.parse(text);

  if (!resp.ok) {
    throw new Error(data?.error || `API request failed (${resp.status} ${resp.statusText})`);
  }

  return data as T;
}
