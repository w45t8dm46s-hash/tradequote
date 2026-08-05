const ENTITLEMENT_ID = "pro";
const APPLE_PRODUCT_IDS = new Set([
  "uk.quoteforge.app.pro.monthly",
  "uk.quoteforge.app.pro.annual",
]);

const CACHE_TTL_MS = 60_000;
const STALE_CACHE_TTL_MS = 15 * 60_000;

export type RevenueCatAccess = {
  active: boolean;
  ever: boolean;
  productIdentifier: string | null;
  expiresAt: string | null;
};

type CachedAccess = {
  loadedAt: number;
  value: RevenueCatAccess;
};

const cache = new Map<string, CachedAccess>();

const NO_ACCESS: RevenueCatAccess = {
  active: false,
  ever: false,
  productIdentifier: null,
  expiresAt: null,
};

export async function getRevenueCatAccess(appUserId: string, forceRefresh = false): Promise<RevenueCatAccess> {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  if (!apiKey) return NO_ACCESS;

  const now = Date.now();
  const cached = cache.get(appUserId);

  if (!forceRefresh && cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    if (response.status === 404) {
      cache.set(appUserId, { loadedAt: now, value: NO_ACCESS });
      return NO_ACCESS;
    }

    if (!response.ok) {
      throw new Error(`RevenueCat returned ${response.status}`);
    }

    const data: any = await response.json();
    const subscriber = data?.subscriber ?? {};
    const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID] ?? null;
    const subscriptions = subscriber?.subscriptions ?? {};

    const expiresAt =
      typeof entitlement?.expires_date === "string"
        ? entitlement.expires_date
        : null;

    const expiryMs = expiresAt ? Date.parse(expiresAt) : Number.POSITIVE_INFINITY;
    const active = Boolean(entitlement) && expiryMs > now;
    const productIdentifier =
      typeof entitlement?.product_identifier === "string"
        ? entitlement.product_identifier
        : null;

    const ever =
      Boolean(entitlement) ||
      Object.keys(subscriptions).some((id) => APPLE_PRODUCT_IDS.has(id));

    const value: RevenueCatAccess = {
      active,
      ever,
      productIdentifier,
      expiresAt,
    };

    cache.set(appUserId, { loadedAt: now, value });
    return value;
  } catch (error) {
    if (cached && now - cached.loadedAt < STALE_CACHE_TTL_MS) {
      console.warn("Using cached RevenueCat access after lookup failure:", error);
      return cached.value;
    }
    throw error;
  }
}
