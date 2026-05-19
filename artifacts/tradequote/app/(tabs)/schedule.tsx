import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JobCard } from "@/components/JobCard";
import { type JobStatus, useJobs } from "@/context/JobsContext";
import { useColors } from "@/hooks/useColors";

const FILTERS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { jobs } = useJobs();
  const [filter, setFilter] = useState<JobStatus | "all">("all");
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
    return [...filtered].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [jobs, filter]);

  const upcoming = jobs.filter((j) => j.status === "scheduled").length;
  const inProgress = jobs.filter((j) => j.status === "in-progress").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topArea, { paddingTop: topPadding + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/new-job")}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {(upcoming > 0 || inProgress > 0) && (
          <View style={styles.summaryRow}>
            {upcoming > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="clock" size={13} color="#3B82F6" />
                <Text style={[styles.summaryText, { color: "#3B82F6" }]}>{upcoming} upcoming</Text>
              </View>
            )}
            {inProgress > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: "#FFFBEB" }]}>
                <Feather name="tool" size={13} color="#F59E0B" />
                <Text style={[styles.summaryText, { color: "#F59E0B" }]}>{inProgress} in progress</Text>
              </View>
            )}
          </View>
        )}

        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.value}
          contentContainerStyle={styles.filterList}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const active = filter === item.value;
            return (
              <TouchableOpacity
                style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setFilter(item.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(j) => j.id}
        contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No jobs scheduled</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tap + to schedule your first job</Text>
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} />}
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
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterList: { gap: 8, paddingBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
