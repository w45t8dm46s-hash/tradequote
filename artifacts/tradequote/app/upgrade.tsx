import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";

import { getApiBaseUrl as getBaseUrl } from "@/lib/api";
import {
  ensureRevenueCatUser,
  notifyPlanChanged,
} from "@/lib/revenueCatClient";

type PriceInfo = {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  productName: string;
};

export default function UpgradeScreen() {
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [price, setPrice] = useState<PriceInfo | null>(null);
  const [iosPackages, setIosPackages] = useState<PurchasesPackage[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (Platform.OS === "ios") {
      (async () => {
        try {
          if (!userId) throw new Error("Please sign in before purchasing QuoteForge Pro.");

          await ensureRevenueCatUser(userId);
          const offerings = await Purchases.getOfferings();
          const current = offerings.current;

          if (!current) {
            throw new Error("QuoteForge Pro plans are temporarily unavailable.");
          }

          const packages = [
            current.monthly ??
              current.availablePackages.find((item) => item.identifier === "$rc_monthly"),
            current.annual ??
              current.availablePackages.find((item) => item.identifier === "$rc_annual"),
          ].filter(Boolean) as PurchasesPackage[];

          if (packages.length === 0) {
            throw new Error("QuoteForge Pro plans are temporarily unavailable.");
          }

          setIosPackages(packages);
        } catch (e: any) {
          setError(e?.message || "Could not load Apple subscription options.");
        } finally {
          setLoadingPrice(false);
        }
      })();
      return;
    }

    (async () => {
      try {
        const baseUrl = getBaseUrl();
        const resp = await fetch(`${baseUrl}/api/stripe/price`);
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data.price) {
          throw new Error(data.error || "Could not load Stripe price.");
        }

        setPrice(data.price);
      } catch (e: any) {
        setError(e?.message || "Could not load pricing");
      } finally {
        setLoadingPrice(false);
      }
    })();
  }, [isLoaded, userId]);

  const refreshServerPlan = async () => {
    const token = await getToken();
    const response = await fetch(
      `${getBaseUrl()}/api/me?refreshApple=1&t=${Date.now()}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Cache-Control": "no-cache",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Purchase completed, but QuoteForge could not refresh your plan.");
    }

    return response.json();
  };

  const purchaseApplePackage = async (purchasePackage: PurchasesPackage) => {
    if (!userId || checkingOut) return;

    setCheckingOut(true);
    setPurchasingPackageId(purchasePackage.identifier);
    setError("");

    try {
      await ensureRevenueCatUser(userId);
      const result = await Purchases.purchasePackage(purchasePackage);
      const active = Boolean(result.customerInfo.entitlements.active.pro);

      if (!active) {
        throw new Error("Apple completed the purchase, but Pro access is still being confirmed.");
      }

      await refreshServerPlan();
      notifyPlanChanged();

      Alert.alert(
        "QuoteForge Pro active",
        "Your Apple subscription is active and unlimited quotes are now available.",
        [{ text: "Continue", onPress: () => router.back() }],
      );
    } catch (e: any) {
      if (!e?.userCancelled) {
        setError(e?.message || "The Apple purchase could not be completed.");
      }
    } finally {
      setCheckingOut(false);
      setPurchasingPackageId(null);
    }
  };

  const restoreApplePurchases = async () => {
    if (!userId || checkingOut) return;

    setCheckingOut(true);
    setPurchasingPackageId("restore");
    setError("");

    try {
      await ensureRevenueCatUser(userId);
      const customerInfo = await Purchases.restorePurchases();
      const active = Boolean(customerInfo.entitlements.active.pro);

      if (!active) {
        setError("No active QuoteForge Pro subscription was found for this Apple ID.");
        return;
      }

      await refreshServerPlan();
      notifyPlanChanged();

      Alert.alert(
        "Purchases restored",
        "Your QuoteForge Pro subscription has been restored.",
        [{ text: "Continue", onPress: () => router.back() }],
      );
    } catch (e: any) {
      setError(e?.message || "Purchases could not be restored.");
    } finally {
      setCheckingOut(false);
      setPurchasingPackageId(null);
    }
  };

  const startCheckout = async () => {
    if (Platform.OS === "ios" || !price) return;
    setCheckingOut(true);
    setError("");

    try {
      const token = await getToken();
      const baseUrl = getBaseUrl();
      const returnUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://quoteforge.uk";

      const resp = await fetch(`${baseUrl}/api/stripe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ priceId: price.id, returnUrl }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.url) {
        setError(data.error || "Could not start checkout");
        return;
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const priceLabel = price
    ? `£${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || "month"}`
    : "£14.99/month";

  const features = (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>QuoteForge Pro</Text>
      <View style={styles.featureRow}>
        <Feather name="check" size={18} color="#22C55E" />
        <Text style={styles.feature}>Unlimited quotes</Text>
      </View>
      <View style={styles.featureRow}>
        <Feather name="check" size={18} color="#22C55E" />
        <Text style={styles.feature}>Professional quote and invoice PDFs</Text>
      </View>
      <View style={styles.featureRow}>
        <Feather name="check" size={18} color="#22C55E" />
        <Text style={styles.feature}>AI wording support for quote scopes</Text>
      </View>
      <View style={styles.featureRow}>
        <Feather name="check" size={18} color="#22C55E" />
        <Text style={styles.feature}>Advanced quote, invoice and job tools</Text>
      </View>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color="#333" />
        </Pressable>

        <View style={styles.iconBubble}>
          <Feather name="zap" size={32} color="#FF6B35" />
        </View>

        <Text style={styles.title}>Upgrade to QuoteForge Pro</Text>
        <Text style={styles.subtitle}>
          Choose monthly or annual access after your five free quotes.
        </Text>

        {features}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loadingPrice ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#FF6B35" />
            <Text style={styles.loadingText}>Loading Apple prices...</Text>
          </View>
        ) : (
          iosPackages.map((item) => {
            const annual = item.identifier === "$rc_annual";
            const busy = purchasingPackageId === item.identifier;

            return (
              <Pressable
                key={item.identifier}
                style={[styles.button, checkingOut && styles.buttonDisabled]}
                onPress={() => purchaseApplePackage(item)}
                disabled={checkingOut}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>
                    {`${annual ? "Annual" : "Monthly"} — ${item.product.priceString}/${annual ? "year" : "month"}`}
                  </Text>
                )}
              </Pressable>
            );
          })
        )}

        <Pressable
          style={[styles.restoreButton, checkingOut && styles.buttonDisabled]}
          onPress={restoreApplePurchases}
          disabled={checkingOut}
        >
          {purchasingPackageId === "restore" ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Payment will be charged to your Apple ID. Subscriptions renew
          automatically unless cancelled before renewal. You can manage or cancel
          your subscription in your Apple ID settings. By subscribing, you agree
          to the{" "}
          <Link href="/terms" style={styles.disclaimerLink}>
            Terms & Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" style={styles.disclaimerLink}>
            Privacy Policy
          </Link>
          .
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Feather name="x" size={24} color="#333" />
      </Pressable>

      <View style={styles.iconBubble}>
        <Feather name="zap" size={32} color="#FF6B35" />
      </View>

      <Text style={styles.title}>Upgrade to QuoteForge Pro</Text>
      <Text style={styles.subtitle}>
        Unlock professional PDFs, AI wording support and advanced quote tools.
      </Text>

      {features}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[
          styles.button,
          (loadingPrice || checkingOut || !price) && styles.buttonDisabled,
        ]}
        onPress={startCheckout}
        disabled={loadingPrice || checkingOut || !price}
      >
        {checkingOut ? (
          <ActivityIndicator color="#fff" />
        ) : loadingPrice ? (
          <Text style={styles.buttonText}>Loading price...</Text>
        ) : price ? (
          <Text style={styles.buttonText}>{`Subscribe — ${priceLabel}`}</Text>
        ) : (
          <Text style={styles.buttonText}>Stripe unavailable</Text>
        )}
      </Pressable>

      <Text style={styles.disclaimer}>
        You'll be redirected to Stripe to complete payment securely. By
        subscribing, you agree to the{" "}
        <Link href="/terms" style={styles.disclaimerLink}>
          Terms & Conditions
        </Link>{" "}
        and{" "}
        <Link href="/privacy" style={styles.disclaimerLink}>
          Privacy Policy
        </Link>
        .
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    lineHeight: 23,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FFE0CC",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 6,
  },
  feature: { flex: 1, fontSize: 15, color: "#333" },
  loadingBox: {
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#666", fontSize: 14 },
  button: {
    backgroundColor: "#FF6B35",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  restoreButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  restoreButtonText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 18,
    lineHeight: 18,
  },
  disclaimerLink: { color: "#ff5a1f", fontWeight: "700" },
  error: {
    color: "#D32F2F",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
});
