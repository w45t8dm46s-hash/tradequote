import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { QuoteCard } from "@/components/QuoteCard";
import { JobCard } from "@/components/JobCard";
import { useExpenses } from "@/context/ExpensesContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useJobs } from "@/context/JobsContext";
import { useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { quotes } = useQuotes();
  const { invoices } = useInvoices();
  const { expenses } = useExpenses();
  const { jobs } = useJobs();

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthQuotes = quotes.filter((q) => new Date(q.createdAt) >= monthStart);
  const totalQuoted = monthQuotes.reduce((s, q) => s + q.total, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.total - i.paidAmount), 0);
  const upcomingJobs = jobs.filter((j) => j.status === "scheduled" || j.status === "in-progress");

  const recentQuotes = quotes.slice(0, 3);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const quickActions = [
    { label: "New Quote", icon: "file-plus", route: "/new-quote", color: colors.primary },
    { label: "New Customer", icon: "user-plus", route: "/new-customer", color: "#3B82F6" },
    { label: "Invoice", icon: "credit-card", route: "/new-invoice", color: "#10B981" },
    { label: "Schedule Job", icon: "calendar", route: "/new-job", color: "#F59E0B" },
    { label: "Log Expense", icon: "minus-circle", route: "/new-expense", color: "#EF4444" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 16, paddingBottom: isWeb ? 34 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
            <Text style={[styles.appTitle, { color: colors.text }]}>QuoteFlow</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-quote")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Quoted this month"
            value={`£${totalQuoted.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`}
            icon="trending-up"
            color={colors.primary}
          />
          <StatCard
            label="Collected"
            value={`£${totalCollected.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`}
            icon="check-circle"
            color="#10B981"
          />
          <StatCard
            label="Outstanding"
            value={`£${totalOutstanding.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`}
            icon="clock"
            color={colors.warning}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsRow}>
            {quickActions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[styles.quickAction, { backgroundColor: a.color + "15", borderColor: a.color + "30" }]}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: a.color }]}>
                  <Feather name={a.icon as any} size={17} color="#fff" />
                </View>
                <Text style={[styles.quickActionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {upcomingJobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Jobs</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {upcomingJobs.slice(0, 2).map((j) => <JobCard key={j.id} job={j} />)}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Quotes</Text>
            {quotes.length > 3 && (
              <TouchableOpacity onPress={() => router.push("/(tabs)/quotes")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentQuotes.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="file-text" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No quotes yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to create your first quote</Text>
            </View>
          ) : (
            recentQuotes.map((q) => <QuoteCard key={q.id} quote={q} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  appTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  newBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  section: { gap: 2, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  seeAll: { fontSize: 14, fontFamily: "Inter_500Medium" },
  quickActionsRow: { gap: 10, paddingBottom: 4, paddingTop: 4 },
  quickAction: { alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 8, minWidth: 90 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  empty: { alignItems: "center", padding: 40, borderRadius: 14, borderWidth: 1, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
