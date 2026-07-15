import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Linking, Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

type PriceInfo = {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  productName: string;
};

import { getApiBaseUrl as getBaseUrl } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

export default function UpgradeScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [price, setPrice] = useState<PriceInfo | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  const startCheckout = async () => {
    if (!price) return;
    setCheckingOut(true);
    setError("");
    try {
      const token = await getToken();
      const baseUrl = getBaseUrl();
      const returnUrl = typeof window !== "undefined" ? window.location.origin : "https://quoteforge.uk";
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
        setCheckingOut(false);
        return;
      }
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      setError(e.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  const priceLabel = price
    ? `£${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || "month"}`
    : "£14.99/month";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }} contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn}>
        <Feather name="x" size={24} color="#333" />
      </Pressable>

      <View style={styles.iconBubble}>
        <Feather name="zap" size={32} color="#FF6B35" />
      </View>

      <Text style={styles.title}>Upgrade to QuoteForge Pro</Text>
      <Text style={styles.subtitle}>Unlock professional PDFs, AI wording support and advanced quote tools.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pro</Text>
        <Text style={styles.cardPrice}>{priceLabel}</Text>
        <View style={styles.featureRow}><Feather name="check" size={18} color="#22C55E" /><Text style={styles.feature}>Professional quote and invoice PDFs</Text></View>
        <View style={styles.featureRow}><Feather name="check" size={18} color="#22C55E" /><Text style={styles.feature}>AI wording support for quote scopes</Text></View>
        <View style={styles.featureRow}><Feather name="check" size={18} color="#22C55E" /><Text style={styles.feature}>Advanced quote, invoice and job tools</Text></View>
        <View style={styles.featureRow}><Feather name="check" size={18} color="#22C55E" /><Text style={styles.feature}>Cancel anytime</Text></View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, (loadingPrice || checkingOut || !price) && styles.buttonDisabled]}
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

      <Text style={styles.disclaimer}>You'll be redirected to Stripe to complete payment securely. Terms, privacy and cancellation details should be reviewed before launch.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  closeBtn: { position: "absolute", top: 20, right: 20, zIndex: 10, padding: 8 },
  iconBubble: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFF1E8", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#FFE0CC", marginBottom: 24 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#FF6B35", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  cardPrice: { fontSize: 32, fontWeight: "700", color: "#111", marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  feature: { fontSize: 15, color: "#333" },
  button: { backgroundColor: "#FF6B35", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disclaimer: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 16 },
  error: { color: "#D32F2F", fontSize: 14, marginBottom: 12, textAlign: "center" },
});
