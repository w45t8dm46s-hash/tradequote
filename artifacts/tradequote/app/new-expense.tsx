import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, useExpenses } from "@/context/ExpensesContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 9); }

export default function NewExpenseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense } = useExpenses();
  const isWeb = Platform.OS === "web";

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Materials");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!description.trim() || !amount) {
      setError("Description and amount are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const expense: Expense = {
        id: genId(), description: description.trim(), amount: parseFloat(amount) || 0,
        category, date, notes, createdAt: new Date().toISOString(),
      };
      await addExpense(expense);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(tabs)/finance" as any);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save expense.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 34 : insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Log Expense</Text>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Description *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Copper pipe and fittings" placeholderTextColor={colors.mutedForeground}
            value={description} onChangeText={setDescription} autoCapitalize="sentences" />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Amount (£) *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00" placeholderTextColor={colors.mutedForeground}
              value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Date</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
              value={date} onChangeText={setDate} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={styles.catGrid}>
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <TouchableOpacity key={cat}
                  style={[styles.catChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => setCategory(cat)} activeOpacity={0.7}>
                  <Text style={[styles.catText, { color: active ? "#fff" : colors.mutedForeground }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Supplier, receipt reference, etc." placeholderTextColor={colors.mutedForeground}
            value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Feather name="plus-circle" size={18} color="#fff" />
          <Text style={styles.btnText}>{saving ? "Saving..." : "Save Expense"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", gap: 10 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
