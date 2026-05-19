import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerCard } from "@/components/CustomerCard";
import { useCustomers } from "@/context/CustomersContext";
import { useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { customers } = useCustomers();
  const { quotes } = useQuotes();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const quoteCountByCustomer = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach((q) => { if (q.customerId) map[q.customerId] = (map[q.customerId] ?? 0) + 1; });
    return map;
  }, [quotes]);

  const filtered = useMemo(
    () => customers.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [customers, search],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topArea, { paddingTop: topPadding + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-customer")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search customers..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No customers yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Try a different search" : "Tap + to add your first customer"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CustomerCard customer={item} quoteCount={quoteCountByCustomer[item.id] ?? 0} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topArea: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  newBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
