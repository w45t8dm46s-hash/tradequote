import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";

import { type LineItem, type Quote, useQuotes } from "@/context/QuotesContext";
import { useSettings } from "@/context/SettingsContext";
import BottomNav from "@/components/BottomNav";
import { getApiBaseUrl } from "@/lib/api";

function toNum(s: string): number {
  const n = Number(String(s).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}


const GENERIC_SCOPE_TEXT = "Thank you for your enquiry. Please review the quote details below.";

function getInitialDraft(original: Quote | undefined): Quote | null {
  if (!original) return null;

  const currentScope = String(original.customerSummary ?? "").trim();
  const roughDescription = String(original.description ?? "").trim();
  const lineItemDescription = original.lineItems
    .map((item) => item.description)
    .filter(Boolean)
    .join("\n");

  const replacementScope = roughDescription || lineItemDescription;

  if (currentScope === GENERIC_SCOPE_TEXT && replacementScope) {
    return { ...original, customerSummary: replacementScope };
  }

  return original;
}

const UNIT_OPTIONS = [
  "item",
  "each",
  "hours",
  "days",
  "metres",
  "m²",
  "rooms",
  "points",
  "fittings",
  "sets",
  "packs",
];

export default function EditQuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getQuote, updateQuote } = useQuotes();
  const { settings, updateSettings } = useSettings();
  const { getToken } = useAuth();

  const original = getQuote(id);
  const [draft, setDraft] = useState<Quote | null>(() => getInitialDraft(original));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [openUnitPicker, setOpenUnitPicker] = useState<number | null>(null);
  const [improvingScope, setImprovingScope] = useState(false);

  if (!draft || !original) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Quote not found</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable>
      </View>
    );
  }

  const updateItem = (idx: number, updates: Partial<LineItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const items = d.lineItems.map((it, i) => {
        if (i !== idx) return it;
        const merged = { ...it, ...updates };
        merged.total = Math.round((merged.quantity || 0) * (merged.rate || 0) * 100) / 100;
        return merged;
      });
      return { ...d, lineItems: items };
    });
  };

  const addItem = () => {
    setDraft((d) => d ? ({ ...d, lineItems: [...d.lineItems, { description: "", quantity: 1, unit: "hours", rate: settings.labourRate || 0, total: settings.labourRate || 0 }] }) : d);
  };

  const removeItem = (idx: number) => {
    setDraft((d) => d ? ({ ...d, lineItems: d.lineItems.filter((_, i) => i !== idx) }) : d);
  };

  const recalc = useMemo(() => {
    const subtotal = Math.round(draft.lineItems.reduce((s, it) => s + (it.total || 0), 0) * 100) / 100;
    const taxRate = draft.taxRate || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return { subtotal, taxAmount, total };
  }, [draft.lineItems, draft.taxRate]);

  const improveScope = async () => {
    if (!settings.aiAssistanceEnabled || improvingScope || !draft) return;

    if (!draft.customerSummary.trim()) {
      setError("Add rough scope wording first.");
      return;
    }

    setImprovingScope(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/ai/improve-wording`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: draft.customerSummary,
          context: `${draft.jobTypeLabel}. Improve the customer-facing scope of works only. Do not add prices.`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to improve wording.");
      }

      if (data?.improvedText) {
        setDraft({ ...draft, customerSummary: String(data.improvedText).trim() });
      }
    } catch (e: any) {
      const rawMsg = String(e?.message ?? "");
      const aiKeyProblem = rawMsg.toLowerCase().includes("api-key") || rawMsg.toLowerCase().includes("x-api-key");

      if (aiKeyProblem) {
        await updateSettings({ aiAssistanceEnabled: false });
        setError("AI is not configured yet, so it has been switched off. You can continue manually.");
      } else {
        setError(rawMsg || "Failed to improve wording.");
      }
    } finally {
      setImprovingScope(false);
    }
  };


  const handleSave = async () => {
    if (saving) return;
    if (!draft.customerName.trim()) { setError("Customer name is required"); return; }
    if (draft.lineItems.length === 0) { setError("Add at least one line item"); return; }
    try {
      setSaving(true);
      setError("");
      await updateQuote(draft.id, {
        customerName: draft.customerName,
        customerAddress: draft.customerAddress,
        jobTypeLabel: draft.jobTypeLabel,
        customerSummary: draft.customerSummary,
        lineItems: draft.lineItems,
        subtotal: recalc.subtotal,
        taxRate: draft.taxRate,
        taxAmount: recalc.taxAmount,
        total: recalc.total,
        validDays: draft.validDays,
      });
      router.replace("/(tabs)/quotes" as any);
    } catch (e: any) {
      setError(e?.message || "Failed to save");
      setSaving(false);
    }
  };

  return (
    <>
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color="#111" />
        </Pressable>
        <Text style={styles.topTitle}>Edit Quote</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        <Field label="Name">
          <TextInput style={styles.input} value={draft.customerName} onChangeText={(v) => setDraft({ ...draft, customerName: v })} placeholder="Customer name" placeholderTextColor="#9CA3AF" />
        </Field>
        <Field label="Address">
          <TextInput style={[styles.input, styles.multi]} value={draft.customerAddress} onChangeText={(v) => setDraft({ ...draft, customerAddress: v })} placeholder="Address" placeholderTextColor="#9CA3AF" multiline />
        </Field>
        <Field label="Job type">
          <TextInput style={styles.input} value={draft.jobTypeLabel} onChangeText={(v) => setDraft({ ...draft, jobTypeLabel: v })} placeholder="e.g. Consumer Unit" placeholderTextColor="#9CA3AF" />
        </Field>
        <Field label="Scope of work (shown on PDF)">
          <TextInput style={[styles.input, styles.multi, { minHeight: 90 }]} value={draft.customerSummary} onChangeText={(v) => setDraft({ ...draft, customerSummary: v })} placeholder="Describe the work to be carried out for the customer..." placeholderTextColor="#9CA3AF" multiline />

          <View style={styles.aiBox}>
            <View style={styles.aiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>AI Assistance</Text>
                <Text style={styles.aiHint}>Improves wording only. It will not price jobs or change totals.</Text>
              </View>
              <Pressable style={[styles.aiToggle, { backgroundColor: settings.aiAssistanceEnabled ? "#FF6B35" : "#9CA3AF" }]} onPress={() => { void updateSettings({ aiAssistanceEnabled: !settings.aiAssistanceEnabled }); }}>
                <Text style={styles.aiToggleText}>{settings.aiAssistanceEnabled ? "On" : "Off"}</Text>
              </Pressable>
            </View>

            {settings.aiAssistanceEnabled && (
              <Pressable style={[styles.aiBtn, improvingScope && { opacity: 0.65 }]} onPress={improveScope} disabled={improvingScope}>
                <Feather name="edit-3" size={14} color="#FF6B35" />
                <Text style={styles.aiBtnText}>{improvingScope ? "Improving..." : "Improve wording"}</Text>
              </Pressable>
            )}
          </View>
        </Field>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Line items</Text>
          <Pressable onPress={addItem} style={styles.addBtn}>
            <Feather name="plus" size={14} color="#FF6B35" />
            <Text style={styles.addBtnText}>Add item</Text>
          </Pressable>
        </View>

        {draft.lineItems.map((item, idx) => (
          <View key={idx} style={styles.itemBlock}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNum}>#{idx + 1}</Text>
              <Pressable onPress={() => removeItem(idx)} style={styles.removeBtn}>
                <Feather name="trash-2" size={14} color="#EF4444" />
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, styles.multi]}
              value={item.description}
              onChangeText={(v) => updateItem(idx, { description: v })}
              placeholder="Description (e.g. 2.5mm² T&E cable, labour, RCBO 32A)"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <View style={styles.itemRow}>
              <View style={{ flex: 1.1 }}>
                <Text style={styles.smallLabel}>Qty</Text>
                <TextInput style={styles.input} value={String(item.quantity ?? "")} onChangeText={(v) => updateItem(idx, { quantity: toNum(v) })} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.smallLabel}>Unit</Text>
                <Pressable
                  style={[styles.input, styles.unitPicker]}
                  onPress={() => setOpenUnitPicker(openUnitPicker === idx ? null : idx)}
                >
                  <Text style={styles.unitPickerText}>{item.unit || "item"}</Text>
                  <Feather name={openUnitPicker === idx ? "chevron-up" : "chevron-down"} size={14} color="#6B7280" />
                </Pressable>

                {openUnitPicker === idx && (
                  <View style={styles.unitOptions}>
                    {UNIT_OPTIONS.map((unit) => {
                      const active = item.unit === unit;
                      return (
                        <Pressable
                          key={unit}
                          style={[styles.unitOption, active && styles.unitOptionActive]}
                          onPress={() => {
                            updateItem(idx, { unit });
                            setOpenUnitPicker(null);
                          }}
                        >
                          <Text style={[styles.unitOptionText, active && styles.unitOptionTextActive]}>{unit}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <View style={{ flex: 1.3 }}>
                <Text style={styles.smallLabel}>Rate (£)</Text>
                <TextInput style={styles.input} value={String(item.rate ?? "")} onChangeText={(v) => updateItem(idx, { rate: toNum(v) })} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={styles.smallLabel}>Total</Text>
                <View style={[styles.input, styles.readonly]}>
                  <Text style={styles.readonlyText}>£{(item.total ?? 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {draft.lineItems.length === 0 && (
          <Text style={styles.empty}>No line items yet. Tap "Add item" to start.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Totals</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalVal}>£{recalc.subtotal.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, { alignItems: "center" }]}>
          <Text style={styles.totalLabel}>VAT rate (%)</Text>
          <TextInput style={[styles.input, { width: 80, textAlign: "right" }]} value={String(draft.taxRate ?? 0)} onChangeText={(v) => setDraft({ ...draft, taxRate: toNum(v) })} keyboardType="decimal-pad" />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>VAT</Text>
          <Text style={styles.totalVal}>£{recalc.taxAmount.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandVal}>£{recalc.total.toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, { alignItems: "center", marginTop: 6 }]}>
          <Text style={styles.totalLabel}>Valid for (days)</Text>
          <TextInput style={[styles.input, { width: 80, textAlign: "right" }]} value={String(draft.validDays ?? 0)} onChangeText={(v) => setDraft({ ...draft, validDays: Math.max(1, Math.min(365, parseInt(v.replace(/\D/g, ""), 10) || 0)) })} keyboardType="number-pad" />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving}>
        <Feather name="check" size={16} color="#fff" />
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save changes"}</Text>
      </Pressable>
    </ScrollView>
      <BottomNav />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><Text style={styles.smallLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  notFound: { fontSize: 16, color: "#111", fontWeight: "600" },
  link: { color: "#FF6B35", fontWeight: "600" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 6 },
  iconBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#EAEAEA", marginBottom: 12, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 8, fontSize: 14, color: "#111", backgroundColor: "#fff" },
  multi: { minHeight: 56, textAlignVertical: "top" },
  unitPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 38 },
  unitPickerText: { color: "#111", fontSize: 14 },
  unitOptions: { marginTop: 6, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, backgroundColor: "#fff", overflow: "hidden" },
  unitOption: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  unitOptionActive: { backgroundColor: "#FFF1E8" },
  unitOptionText: { color: "#111", fontSize: 13 },
  unitOptionTextActive: { color: "#FF6B35", fontWeight: "700" },
  readonly: { backgroundColor: "#F3F4F6", justifyContent: "center", minHeight: 38 },
  readonlyText: { color: "#111", fontWeight: "600", fontSize: 14 },
  itemBlock: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12, gap: 10 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemNum: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  removeBtn: { padding: 6 },
  itemRow: { flexDirection: "row", gap: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#FFF1E8" },
  addBtnText: { color: "#FF6B35", fontSize: 12, fontWeight: "700" },
  empty: { color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: "#6B7280", fontSize: 14 },
  totalVal: { color: "#111", fontSize: 14, fontWeight: "600" },
  grandRow: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10, marginTop: 4 },
  grandLabel: { color: "#111", fontWeight: "700", fontSize: 16 },
  grandVal: { color: "#FF6B35", fontWeight: "700", fontSize: 18 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#FF6B35", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  error: { color: "#D32F2F", fontSize: 13, textAlign: "center", marginVertical: 8 },
  aiBox: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF7ED", borderRadius: 12, padding: 12, gap: 10 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiTitle: { fontSize: 13, color: "#111", fontWeight: "700" },
  aiHint: { fontSize: 12, color: "#6B7280", lineHeight: 17, marginTop: 2 },
  aiToggle: { minWidth: 54, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  aiToggleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  aiBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: "#fff" },
  aiBtnText: { color: "#FF6B35", fontSize: 13, fontWeight: "700" },

});
