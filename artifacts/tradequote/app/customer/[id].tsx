import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InvoiceCard } from "@/components/InvoiceCard";
import { JobCard } from "@/components/JobCard";
import { QuoteCard } from "@/components/QuoteCard";
import { useCustomers } from "@/context/CustomersContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useJobs } from "@/context/JobsContext";
import { useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCustomer, deleteCustomer } = useCustomers();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();
  const { jobs } = useJobs();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const customer = getCustomer(id);
  const customerQuotes = quotes.filter((q) => q.customerId === id);
  const customerInvoices = invoices.filter((i) => i.customerId === id);
  const customerJobs = jobs.filter((j) => j.customerId === id);

  if (!customer) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>Customer not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = customer.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const totalRevenue = customerInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);

  const handleDelete = () => {
    Alert.alert("Delete Customer", "Remove this customer? Their quotes and invoices will remain.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteCustomer(customer.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 34 : insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
          </View>
          <Text style={[styles.customerName, { color: colors.text }]}>{customer.name}</Text>
          <View style={styles.contactRow}>
            {!!customer.phone && <View style={styles.contactChip}><Feather name="phone" size={13} color={colors.mutedForeground} /><Text style={[styles.contactText, { color: colors.mutedForeground }]}>{customer.phone}</Text></View>}
            {!!customer.email && <View style={styles.contactChip}><Feather name="mail" size={13} color={colors.mutedForeground} /><Text style={[styles.contactText, { color: colors.mutedForeground }]}>{customer.email}</Text></View>}
          </View>
          {!!customer.address && <Text style={[styles.address, { color: colors.mutedForeground }]}>{customer.address}</Text>}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: "Quotes", value: String(customerQuotes.length), icon: "file-text", color: colors.primary },
            { label: "Jobs", value: String(customerJobs.length), icon: "tool", color: colors.warning },
            { label: "Revenue", value: `£${totalRevenue.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`, icon: "trending-up", color: "#10B981" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={s.icon as any} size={18} color={s.color} />
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/new-quote", params: { customerId: customer.id, customerName: customer.name, customerAddress: customer.address } })}>
            <Feather name="file-plus" size={14} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>New Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/new-job", params: { customerId: customer.id } })}>
            <Feather name="calendar" size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/new-invoice", params: { customerId: customer.id } })}>
            <Feather name="credit-card" size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Invoice</Text>
          </TouchableOpacity>
        </View>

        {!!customer.notes && (
          <View style={[styles.notesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NOTES</Text>
            <Text style={[styles.notesText, { color: colors.text }]}>{customer.notes}</Text>
          </View>
        )}

        {customerQuotes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUOTES ({customerQuotes.length})</Text>
            {customerQuotes.slice(0, 3).map((q) => <QuoteCard key={q.id} quote={q} />)}
          </View>
        )}

        {customerJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>JOBS ({customerJobs.length})</Text>
            {customerJobs.slice(0, 3).map((j) => <JobCard key={j.id} job={j} />)}
          </View>
        )}

        {customerInvoices.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>INVOICES ({customerInvoices.length})</Text>
            {customerInvoices.slice(0, 3).map((i) => <InvoiceCard key={i.id} invoice={i} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 15, fontFamily: "Inter_500Medium" },
  scroll: { padding: 16, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 26, fontFamily: "Inter_700Bold" },
  customerName: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  contactRow: { flexDirection: "row", gap: 16, flexWrap: "wrap", justifyContent: "center" },
  contactChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  contactText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  address: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  notesBox: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
});
