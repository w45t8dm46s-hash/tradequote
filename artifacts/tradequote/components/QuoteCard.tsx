import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type Quote } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";

const JOB_TYPE_ICONS: Record<string, string> = {
  plumbing: "droplet",
  electrical: "zap",
  carpentry: "tool",
  painting: "edit-3",
  roofing: "home",
  landscaping: "sun",
  hvac: "wind",
  tiling: "grid",
  general: "briefcase",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "#F3F4F6", text: "#6B7280" },
  sent: { label: "Sent", bg: "#EFF6FF", text: "#3B82F6" },
  accepted: { label: "Accepted", bg: "#ECFDF5", text: "#10B981" },
  declined: { label: "Declined", bg: "#FEF2F2", text: "#EF4444" },
};

interface QuoteCardProps {
  quote: Quote;
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const colors = useColors();
  const status = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;
  const icon = JOB_TYPE_ICONS[quote.jobType] ?? "briefcase";
  const date = new Date(quote.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/quote/[id]", params: { id: quote.id } })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
            {quote.customerName}
          </Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            £{quote.total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {quote.jobTypeLabel} · {date}
          </Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  meta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
