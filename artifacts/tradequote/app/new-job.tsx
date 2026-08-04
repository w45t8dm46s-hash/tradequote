import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomers } from "@/context/CustomersContext";
import { type Job, type Material, useJobs } from "@/context/JobsContext";
import { useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 9); }

const JOB_TYPES = [
  { id: "rewire", label: "Rewire", icon: "zap" },
  { id: "sockets-switches", label: "Sockets & Switches", icon: "square" },
  { id: "lighting", label: "Lighting", icon: "sun" },
  { id: "consumer-unit", label: "Consumer Unit", icon: "shield" },
  { id: "ev-charger", label: "EV Charger", icon: "battery-charging" },
  { id: "fault-finding", label: "Fault Finding", icon: "search" },
  { id: "eicr", label: "EICR / Testing", icon: "clipboard" },
  { id: "smoke-alarms", label: "Smoke Alarms", icon: "bell" },
  { id: "other", label: "Other Electrical", icon: "tool" },
];

export default function NewJobScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addJob } = useJobs();
  const { customers } = useCustomers();
  const params = useLocalSearchParams<{ customerId?: string; quoteId?: string; customerName?: string; address?: string; materials?: string; scheduledDate?: string }>();
  const isWeb = Platform.OS === "web";

  const { quotes } = useQuotes();
  const [customerName, setCustomerName] = useState(params.customerName ?? "");
  const [customerId, setCustomerId] = useState(params.customerId ?? "");
  const [address, setAddress] = useState(params.address ?? "");
  const [jobType, setJobType] = useState("rewire");
  const [scheduledDate, setScheduledDate] = useState(params.scheduledDate ?? new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [durationDays, setDurationDays] = useState(1);
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<Material[]>(() => {
    if (!params.materials) return [];
    try {
      const parsed = JSON.parse(params.materials) as Array<{ name: string; quantity?: number; unit?: string }>;
      return parsed.map((m) => ({
        id: genId(),
        name: m.name,
        quantity: m.quantity ?? 1,
        unit: m.unit ?? "units",
        cost: 0,
        ordered: false,
      }));
    } catch {
      return [];
    }
  });
  const [quoteId, setQuoteId] = useState(params.quoteId ?? "");
  const [newMaterial, setNewMaterial] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedQuote = quoteId ? quotes.find((q) => q.id === quoteId) : undefined;

  useEffect(() => {
    if (quoteId && quotes.length > 0) {
      const quote = quotes.find((q) => q.id === quoteId);
      if (quote) {
        setCustomerName(quote.customerName);
        setAddress(quote.customerAddress ?? "");
        setCustomerId(quote.customerId ?? "");
        setJobType(quote.jobType);
        if (materials.length === 0) {
          setMaterials(quote.lineItems.map((item) => ({
            id: genId(),
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            cost: 0,
            ordered: false,
          })));
        }
      }
    } else if (params.customerId && !params.customerName) {
      const c = customers.find((c) => c.id === params.customerId);
      if (c) { setCustomerName(c.name); setAddress(c.address); setCustomerId(c.id); }
    }
  }, [quoteId, quotes, materials.length, params.customerId, params.customerName]);

  const selectedType = JOB_TYPES.find((t) => t.id === jobType) ?? JOB_TYPES[0];

  const addMaterial = () => {
    if (!newMaterial.trim()) return;
    setMaterials((p) => [...p, { id: genId(), name: newMaterial.trim(), quantity: 1, unit: "units", cost: 0, ordered: false }]);
    setNewMaterial("");
  };

  const toggleOrdered = (id: string) => setMaterials((p) => p.map((m) => m.id === id ? { ...m, ordered: !m.ordered } : m));

  const save = async () => {
    if (saving) return;
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const job: Job = {
        id: genId(),
        customerId,
        customerName: customerName.trim(),
        quoteId: quoteId || undefined,
        title: `${selectedType.label} job`,
        jobType,
        jobTypeLabel: selectedType.label,
        status: "scheduled",
        scheduledDate,
        scheduledTime,
        durationDays: Math.max(1, durationDays),
        address,
        notes,
        materials,
        createdAt: new Date().toISOString(),
      };
      await addJob(job);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(tabs)/schedule" as any);
    } catch (e: any) {
      setError(e?.message ?? "Failed to schedule job.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 100 : insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Schedule Job</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Customer *</Text>
          {customers.length > 0 && (
            <TouchableOpacity
              style={[styles.input, styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowPicker(!showPicker)}
            >
              <Text style={[{ color: customerName ? colors.text : colors.mutedForeground, flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" }]}>
                {customerName || "Select existing customer..."}
              </Text>
              <Feather name={showPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {showPicker && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {customers.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.dropItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setCustomerName(c.name); setCustomerId(c.id); setAddress(c.address); setShowPicker(false); }}>
                  <Text style={[styles.dropText, { color: colors.text }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={customers.length > 0 ? "Or type a new customer name" : "Customer name"}
            placeholderTextColor={colors.mutedForeground}
            value={customerName}
            onChangeText={(v) => { setCustomerName(v); setCustomerId(""); }}
            autoCapitalize="words" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Link Quote</Text>
          <TouchableOpacity
            style={[styles.input, styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowQuotePicker(!showQuotePicker)}
          >
            <Text style={[{ color: quoteId ? colors.text : colors.mutedForeground, flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" }]}> 
              {selectedQuote ? `${selectedQuote.quoteNumber} · ${selectedQuote.customerName}` : "Select a quote to link..."}
            </Text>
            <Feather name={showQuotePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showQuotePicker && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              {quotes.length === 0 ? (
                <Text style={[styles.dropText, { color: colors.mutedForeground, padding: 14 }]}>No quotes available</Text>
              ) : (
                quotes.map((quote) => (
                  <TouchableOpacity key={quote.id} style={[styles.dropItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setQuoteId(quote.id); setShowQuotePicker(false); }}
                  >
                    <Text style={[styles.dropText, { color: colors.text }]}>{quote.quoteNumber} · {quote.customerName}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          {selectedQuote ? (
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>Quote linked to this job. You can still adjust date, time and duration.</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Job Type</Text>
          <View style={styles.typeRow}>
            {JOB_TYPES.map((t) => {
              const active = jobType === t.id;
              return (
                <TouchableOpacity key={t.id}
                  style={[styles.typeChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setJobType(t.id)} activeOpacity={0.7}>
                  <Feather name={t.icon as any} size={14} color={active ? "#fff" : colors.primary} />
                  <Text style={[styles.typeText, { color: active ? "#fff" : colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        onPress={() => router.push("/(tabs)/schedule" as any)}
        activeOpacity={0.85}
      >
        <Feather name="calendar" size={18} color={colors.primary} />
        <Text style={[styles.btnText, { color: colors.primary }]}>View Schedule Calendar</Text>
      </TouchableOpacity>

      <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
              value={scheduledDate} onChangeText={setScheduledDate} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Time</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="09:00" placeholderTextColor={colors.mutedForeground}
              value={scheduledTime} onChangeText={setScheduledTime} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Duration (days)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="1" placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={String(durationDays)}
            onChangeText={(value) => {
              const parsed = parseInt(value, 10);
              setDurationDays(Number.isNaN(parsed) ? 1 : Math.max(1, parsed));
            }}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Materials Needed</Text>
          <View style={styles.materialInputRow}>
            <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Add a material..." placeholderTextColor={colors.mutedForeground}
              value={newMaterial} onChangeText={setNewMaterial}
              onSubmitEditing={addMaterial} returnKeyType="done" />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={addMaterial}>
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {materials.map((m) => (
            <View key={m.id} style={[styles.materialRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity onPress={() => toggleOrdered(m.id)}>
                <Feather name={m.ordered ? "check-square" : "square"} size={18} color={m.ordered ? "#10B981" : colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={[styles.materialName, { color: m.ordered ? colors.mutedForeground : colors.text, textDecorationLine: m.ordered ? "line-through" : "none" }]}>
                {m.name}
              </Text>
              <TouchableOpacity onPress={() => setMaterials((p) => p.filter((x) => x.id !== m.id))}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Access notes, special instructions..." placeholderTextColor={colors.mutedForeground}
            value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Feather name="calendar" size={18} color="#fff" />
          <Text style={styles.btnText}>{saving ? "Scheduling..." : "Schedule Job"}</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", gap: 10 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: Platform.OS === "web" ? 16 : 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  picker: { flexDirection: "row", alignItems: "center" },
  dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: -8 },
  dropItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  dropText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  typeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  materialInputRow: { flexDirection: "row", gap: 8 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  materialRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  materialName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular" },
});
