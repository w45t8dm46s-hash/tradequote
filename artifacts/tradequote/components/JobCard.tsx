import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { type Job } from "@/context/JobsContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#3B82F6" },
  "in-progress": { label: "In Progress", color: "#F59E0B" },
  completed: { label: "Completed", color: "#10B981" },
  cancelled: { label: "Cancelled", color: "#EF4444" },
};

const JOB_ICONS: Record<string, string> = {
  plumbing: "droplet", electrical: "zap", carpentry: "tool", painting: "edit-3",
  roofing: "home", landscaping: "sun", hvac: "wind", tiling: "grid", general: "briefcase",
};

export function JobCard({ job }: { job: Job }) {
  const colors = useColors();
  const status = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.scheduled;
  const icon = JOB_ICONS[job.jobType] ?? "briefcase";
  const date = new Date(job.scheduledDate).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
  const orderedCount = job.materials.filter((m) => m.ordered).length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/job/[id]", params: { id: job.id } })}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{job.customerName}</Text>
          <View style={[styles.statusPill, { backgroundColor: status.color + "18" }]}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {job.jobTypeLabel} · {date}{job.scheduledTime ? ` · ${job.scheduledTime}` : ""}
        </Text>
        {job.materials.length > 0 && (
          <Text style={[styles.materials, { color: colors.mutedForeground }]}>
            Materials: {orderedCount}/{job.materials.length} ordered
          </Text>
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
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  meta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  materials: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
