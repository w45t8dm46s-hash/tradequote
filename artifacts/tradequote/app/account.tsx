import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { fetchWithRetry, getApiBaseUrl, parseJsonResponse } from "@/lib/api";
import BottomNav from "@/components/BottomNav";

type MeResponse = {
  id: string;
  email: string | null;
  quoteCount: number;
  quoteLimit: number;
  isPro: boolean;
  quotesRemaining: number | null;
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number | null;
    priceAmount: number | null;
    currency: string | null;
    interval: string | null;
  } | null;
};

function formatDate(unixSeconds: number | null): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatPrice(amount: number | null, currency: string | null, interval: string | null): string {
  if (amount == null) return "";
  const symbol = currency === "gbp" || currency === "GBP" ? "£" : currency === "usd" ? "$" : currency === "eur" ? "€" : "";
  return `${symbol}${(amount / 100).toFixed(2)}/${interval ?? "month"}`;
}

export default function AccountScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [me, setMe] = useState<MeResponse | null>(null);
  const meRef = useRef<MeResponse | null>(null);
  const hasLoadedRef = useRef(false);
  const initialLoadStartedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async (silent = false) => {
    setError("");

    if (!silent && !hasLoadedRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const resp = await fetchWithRetry(async () => {
        const token = await getToken();
        return fetch(`${getApiBaseUrl()}/api/me?t=${Date.now()}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Cache-Control": "no-cache",
          },
        });
      });

      const data = await parseJsonResponse<MeResponse>(resp);
      meRef.current = data;
      setMe(data);
      hasLoadedRef.current = true;
    } catch (e: any) {
      if (meRef.current) {
        setError("");
      } else {
        setError(e?.message || "Could not load account. Please refresh or try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { if (initialLoadStartedRef.current) return; initialLoadStartedRef.current = true; void load(false); }, [load]);


  const handleCancel = async () => {
    setShowConfirm(false);
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const token = await getToken();
      const resp = await fetchWithRetry(() => fetch(`${getApiBaseUrl()}/api/stripe/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }));

      const data = await parseJsonResponse<any>(resp);
      setInfo("Your subscription will end at the end of the current billing period. You'll keep Pro access until then.");
      await load(true);
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const token = await getToken();
      const resp = await fetchWithRetry(() => fetch(`${getApiBaseUrl()}/api/stripe/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }));

      const data = await parseJsonResponse<any>(resp);
      setInfo("Your subscription has been resumed. Renewal will continue as normal.");
      await load(true);
    } catch (e: any) {
      setError(e?.message || "Resume failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (busy) return;

    const proceed =
      Platform.OS === "web"
        ? window.confirm("Sign out of QuoteForge?")
        : true;

    if (!proceed) return;

    setBusy(true);
    setError("");

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("qf_show_trade_picker_once");
      }

      await clerk.signOut();

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = "/sign-in";
      } else {
        router.replace("/(auth)/sign-in" as any);
      }
    } catch (e: any) {
      setError(e?.message || "Could not sign out. Please refresh and try again.");
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (busy) return;

    setShowDeleteConfirm(false);
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const token = await getToken();
      const resp = await fetchWithRetry(() =>
        fetch(`${getApiBaseUrl()}/api/account`, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
      );

      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.error || "Could not delete account.");
      }

      try {
        await clerk.signOut();
      } catch {
        // The Clerk user has already been deleted by the API.
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = "/sign-in";
      } else {
        router.replace("/(auth)/sign-in" as any);
      }
    } catch (e: any) {
      setError(e?.message || "Could not delete account. Please try again.");
      setBusy(false);
    }
  };

  const email = me?.email || user?.primaryEmailAddress?.emailAddress || "";
  const sub = me?.subscription ?? null;

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.replace("/(tabs)" as any)} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#111" />
          </Pressable>
          <Text style={styles.topTitle}>My Account</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading && !me ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator color="#FF6B35" />
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Signed in as</Text>
              <Text style={styles.value}>{email || "—"}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>Subscription</Text>
                <View style={[styles.badge, me?.isPro ? styles.badgePro : styles.badgeFree]}>
                  <Text style={[styles.badgeText, me?.isPro ? styles.badgeTextPro : styles.badgeTextFree]}>
                    {me?.isPro ? "Pro" : "Free"}
                  </Text>
                </View>
              </View>

              {error ? (
                <View style={styles.errorPanel}>
                  <Text style={styles.error}>{error}</Text>
                  <Pressable style={styles.outlineBtn} onPress={() => load(false)}>
                    <Feather name="refresh-cw" size={16} color="#111" />
                    <Text style={styles.outlineBtnText}>Retry account check</Text>
                  </Pressable>
                </View>
              ) : null}

              {sub ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan</Text>
                    <Text style={styles.detailValue}>{formatPrice(sub.priceAmount, sub.currency, sub.interval)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{sub.cancelAtPeriodEnd ? "Ends on" : "Renews on"}</Text>
                    <Text style={styles.detailValue}>{formatDate(sub.currentPeriodEnd)}</Text>
                  </View>
                  {sub.cancelAtPeriodEnd && (
                    <View style={styles.notice}>
                      <Feather name="alert-circle" size={14} color="#B45309" />
                      <Text style={styles.noticeText}>Cancellation scheduled. You'll keep Pro until {formatDate(sub.currentPeriodEnd)}.</Text>
                    </View>
                  )}
                </View>
              ) : me ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.smallMuted}>
                    You've used {me.quoteCount ?? 0} of {me.quoteLimit ?? 5} free quotes.
                  </Text>
                </View>
              ) : null}

              {info ? <Text style={styles.info}>{info}</Text> : null}

              {Platform.OS !== "ios" && me ? (
                <View style={{ gap: 10, marginTop: 14 }}>
                  {!me.isPro && (
                    <Pressable style={styles.primaryBtn} onPress={() => router.push("/upgrade")}>
                      <Feather name="zap" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Upgrade to Pro</Text>
                    </Pressable>
                  )}

                  {sub && !sub.cancelAtPeriodEnd && (
                    <Pressable style={[styles.dangerBtn, busy && styles.btnDisabled]} onPress={() => setShowConfirm(true)} disabled={busy}>
                      {busy ? <ActivityIndicator color="#EF4444" /> : (
                        <>
                          <Feather name="x-circle" size={16} color="#EF4444" />
                          <Text style={styles.dangerBtnText}>Cancel subscription</Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  {sub && sub.cancelAtPeriodEnd && (
                    <Pressable style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleResume} disabled={busy}>
                      {busy ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Feather name="refresh-cw" size={16} color="#fff" />
                          <Text style={styles.primaryBtnText}>Resume subscription</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Business settings</Text>
              <Text style={styles.smallMuted}>Set your branding, hourly labour rate and VAT details — these are used on quote and invoice PDFs.</Text>
              <Pressable style={styles.outlineBtn} onPress={() => router.push("/settings")}>
                <Feather name="settings" size={16} color="#111" />
                <Text style={styles.outlineBtnText}>Open settings</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account actions</Text>
              <Pressable
                style={[styles.outlineBtn, busy && styles.btnDisabled]}
                onPress={handleSignOut}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <>
                    <Feather name="log-out" size={16} color="#111" />
                    <Text style={styles.outlineBtnText}>Sign out</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.deleteAccountBtn, busy && styles.btnDisabled]}
                onPress={() => setShowDeleteConfirm(true)}
                disabled={busy}
              >
                <Feather name="trash-2" size={16} color="#EF4444" />
                <Text style={styles.deleteAccountBtnText}>Delete account</Text>
              </Pressable>

              <View style={styles.legalLinks}>
                <Link href="/terms" style={styles.legalLink}>Terms</Link>
                <Text style={styles.legalSeparator}>•</Text>
                <Link href="/privacy" style={styles.legalLink}>Privacy</Link>
                <Text style={styles.legalSeparator}>•</Text>
                <Link href={"/support" as any} style={styles.legalLink}>Support</Link>
                <Text style={styles.legalSeparator}>•</Text>
                <Link href="/referral-terms" style={styles.legalLink}>Referral Partner Terms</Link>
              </View>
            </View>

            <Text style={styles.footnote}>
              Cancelling stops future renewals. You'll keep Pro access until the end of the current billing period and can resume any time before then.
            </Text>
          </>
        )}

        <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowConfirm(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Cancel subscription?</Text>
              <Text style={styles.modalBody}>
                Your Pro access will continue until {formatDate(sub?.currentPeriodEnd ?? null)}. After that you'll go back to the free plan ({me?.quoteLimit ?? 5}-quote limit). You can resume any time before then.
              </Text>
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setShowConfirm(false)}>
                  <Text style={styles.modalBtnGhostText}>Keep Pro</Text>
                </Pressable>
                <Pressable style={[styles.modalBtn, styles.modalBtnDanger]} onPress={handleCancel}>
                  <Text style={styles.modalBtnDangerText}>Cancel subscription</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Delete account permanently?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your QuoteForge login, quotes, invoices,
              customers and settings. Any active web subscription will be
              cancelled immediately. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalBtnGhostText}>Keep account</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.modalBtnDangerText}>Delete permanently</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 110 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18, marginTop: 6 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#EAEAEA", marginBottom: 14, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 12, color: "#666", fontWeight: "500" },
  value: { fontSize: 15, color: "#111", fontWeight: "500" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePro: { backgroundColor: "#FFF1E8" },
  badgeFree: { backgroundColor: "#F1F5F9" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextPro: { color: "#FF6B35" },
  badgeTextFree: { color: "#475569" },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { color: "#666", fontSize: 14 },
  detailValue: { color: "#111", fontSize: 14, fontWeight: "600" },
  smallMuted: { color: "#666", fontSize: 13 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, padding: 10, borderRadius: 10, marginTop: 4 },
  noticeText: { color: "#92400E", fontSize: 12.5, flex: 1, lineHeight: 17 },
  info: { color: "#15803D", fontSize: 13, marginTop: 8 },
  error: { color: "#D32F2F", fontSize: 13, marginTop: 8 },
  errorPanel: { gap: 10, marginTop: 8 },
  primaryBtn: { backgroundColor: "#FF6B35", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dangerBtn: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  dangerBtnText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
  outlineBtn: { borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: "#fff" },
  outlineBtnText: { color: "#111", fontSize: 15, fontWeight: "600" },
  deleteAccountBtn: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 10,
  },
  deleteAccountBtnText: { color: "#EF4444", fontWeight: "600" },

  legalLinks: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 8, marginTop: 18 },
  legalLink: { color: "#ff5a1f", fontWeight: "700", fontSize: 13 },
  legalSeparator: { color: "#999", fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  footnote: { fontSize: 11.5, color: "#999", textAlign: "center", marginTop: 4, lineHeight: 16, paddingHorizontal: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 10 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  modalBody: { fontSize: 14, color: "#444", lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnGhost: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  modalBtnGhostText: { color: "#111", fontWeight: "600" },
  modalBtnDanger: { backgroundColor: "#EF4444" },
  modalBtnDangerText: { color: "#fff", fontWeight: "700" },
});
