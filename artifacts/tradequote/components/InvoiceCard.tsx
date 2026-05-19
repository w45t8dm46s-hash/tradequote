import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type Invoice } from "@/context/InvoicesContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "#F3F4F6", text: "#6B7280" },
  sent: { label: "Sent", bg: "#EFF6FF", text: "#3B82F6" },
  paid: { label: "Paid", bg: "#ECFDF5", text: "#10B981" },
  partial: { label: "Part Paid", bg: "#FFFBEB", text: "#F59E0B" },
  overdue: { label: "Overdue", bg: "#FEF2F2", text: "#EF4444" },
};

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const colors = useColors();
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const outstanding = invoice.total - invoice.paidAmount;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/invoice/[id]", params: { id: invoice.id } })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
        <Feather name="file-text" size={20} color="#3B82F6" />
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{invoice.customerName}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>£{invoice.total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{invoice.invoiceNumber} · Due {dueDate}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
        {invoice.status === "partial" && (
          <Text style={[styles.outstanding, { color: colors.warning }]}>£{outstanding.toFixed(2)} outstanding</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  amount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  outstanding: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
