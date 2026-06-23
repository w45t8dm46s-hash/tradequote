import { Platform } from "react-native";

export function getApiBaseUrl(): string {
  // Explicit API URL takes top priority (required when webapp + API are on separate Render services)
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  if (process.env.VITE_API_URL) return (process.env.VITE_API_URL as string).replace(/\/$/, "");

  // Native app — use the configured domain if provided
  if (Platform.OS !== "web") {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (domain) return `https://${domain}`;
    return "";
  }

  // Web — fall back to same-origin only when no explicit API URL is set.
  // NOTE: this WILL break if the webapp and API are on different origins.
  // Always set EXPO_PUBLIC_API_URL in production to avoid this.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

/**
 * Parses a fetch Response as JSON, with a clear error if the server returned
 * HTML (e.g. a Render/Nginx error page instead of the API).
 */
export async function parseJsonResponse<T = unknown>(resp: Response): Promise<T> {
  const contentType = resp.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await resp.text().catch(() => "(unreadable body)");
    const preview = text.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(
      `API returned non-JSON response (${resp.status} ${resp.statusText}). ` +
      `Check that EXPO_PUBLIC_API_URL points to the correct API server. ` +
      `Body preview: ${preview}`
    );
  }
  return resp.json() as Promise<T>;
}
