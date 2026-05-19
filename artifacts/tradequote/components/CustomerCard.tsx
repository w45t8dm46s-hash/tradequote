import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type Customer } from "@/context/CustomersContext";
import { useColors } from "@/hooks/useColors";

interface CustomerCardProps {
  customer: Customer;
  quoteCount?: number;
}

export function CustomerCard({ customer, quoteCount = 0 }: CustomerCardProps) {
  const colors = useColors();
  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/customer/[id]", params: { id: customer.id } })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{customer.name}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {customer.phone || customer.email || customer.address || "No contact info"}
        </Text>
      </View>
      <View style={styles.right}>
        {quoteCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {quoteCount} {quoteCount === 1 ? "quote" : "quotes"}
            </Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 15, fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
