import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InvoiceCard } from "@/components/InvoiceCard";
import { useExpenses } from "@/context/ExpensesContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useColors } from "@/hooks/useColors";

type Tab = "invoices" | "expenses";

const CATEGORY_ICONS: Record<string, string> = {
  "Materials": "package", "Tools & Equipment": "tool", "Fuel & Transport": "truck",
  "Subcontractors": "users", "Insurance": "shield", "Marketing": "bar-chart-2",
  "Office & Admin": "folder", "Other": "more-horizontal",
};

export default function FinanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { invoices } = useInvoices();
  const { expenses, deleteExpense } = useExpenses();
  const [tab, setTab] = useState<Tab>("invoices");
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : 0;

  const stats = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.paidAmount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    return { totalInvoiced, totalCollected, totalOutstanding, totalExpenses };
  }, [invoices, expenses]);

  const bottomPad = isWeb ? 34 : insets.bottom + 100;

  const handleDeleteExpense = (id: string) => {
    const doDelete = async () => {
      await deleteExpense(id);
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Delete this expense?")) {
        void doDelete();
      }
      return;
    }

    Alert.alert("Delete Expense", "Delete this expense?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { void doDelete(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <View style={[styles.topArea, { paddingTop: topPadding + 16 }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Finance</Text>
            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(tab === "invoices" ? "/new-invoice" : "/new-expense")}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            {[
              { label: "Invoiced", value: stats.totalInvoiced, color: "#3B82F6" },
              { label: "Collected", value: stats.totalCollected, color: "#10B981" },
              { label: "Outstanding", value: stats.totalOutstanding, color: "#F59E0B" },
              { label: "Expenses", value: stats.totalExpenses, color: "#EF4444" },
            ].map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>
                  £{s.value.toLocaleString("en-GB", { minimumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {(["invoices", "expenses"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, { borderBottomColor: tab === t ? colors.primary : "transparent" }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                {t === "invoices" ? `Invoices (${invoices.length})` : `Expenses (${expenses.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.listArea, { paddingBottom: bottomPad }]}>
          {tab === "invoices" ? (
            invoices.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="file-text" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No invoices yet</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to create an invoice</Text>
              </View>
            ) : (
              invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)
            )
          ) : expenses.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="credit-card" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to log an expense</Text>
            </View>
          ) : (
            expenses.map((exp) => (
              <View key={exp.id} style={[styles.expenseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.expenseIcon, { backgroundColor: colors.muted }]}>
                  <Feather name={(CATEGORY_ICONS[exp.category] ?? "circle") as any} size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>{exp.description}</Text>
                  <Text style={[styles.expenseMeta, { color: colors.mutedForeground }]}>
                    {exp.category} · {new Date(exp.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, { color: "#EF4444" }]}>-£{exp.amount.toFixed(2)}</Text>
                  <TouchableOpacity style={[styles.deleteExpenseBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={() => handleDeleteExpense(exp.id)} activeOpacity={0.85}>
                    <Feather name="trash-2" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  newBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "47%", flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  listArea: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  expenseRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  expenseIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  expenseMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  expenseRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  expenseAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  deleteExpenseBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
