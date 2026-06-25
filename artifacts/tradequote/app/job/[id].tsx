import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type JobStatus, useJobs } from "@/context/JobsContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";
import { getApiBaseUrl } from "@/lib/api";

const STATUS_OPTIONS: { value: JobStatus; label: string; color: string }[] = [
  { value: "scheduled", label: "Scheduled", color: "#3B82F6" },
  { value: "in-progress", label: "In Progress", color: "#F59E0B" },
  { value: "completed", label: "Completed", color: "#10B981" },
  { value: "cancelled", label: "Cancelled", color: "#EF4444" },
];

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getJob, updateJob, deleteJob } = useJobs();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const job = getJob(id);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>Job not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === job.status) ?? STATUS_OPTIONS[0];
  const date = new Date(job.scheduledDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const orderedCount = job.materials.filter((m) => m.ordered).length;

  const toggleMaterial = async (materialId: string) => {
    const updated = job.materials.map((m) => m.id === materialId ? { ...m, ordered: !m.ordered } : m);
    await updateJob(job.id, { materials: updated });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateFollowUp = async () => {
    setGeneratingFollowUp(true);
    setFollowUpMessage("");
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: job.customerName, jobType: job.jobTypeLabel,
          status: job.status, scheduledDate: job.scheduledDate, notes: job.notes,
        }),
      });
      const data = await res.json();
      setFollowUpMessage(data.message ?? "Unable to generate message.");
    } catch {
      setFollowUpMessage("Failed to generate message. Please check your connection.");
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Job", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteJob(job.id); router.back(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 34 : insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={20} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.metaRow}>
            <Text style={[styles.jobType, { color: colors.mutedForeground }]}>{job.jobTypeLabel}</Text>
            <TouchableOpacity style={[styles.statusBadge, { backgroundColor: currentStatus.color + "18" }]} onPress={() => setShowStatusPicker(!showStatusPicker)}>
              <View style={[styles.dot, { backgroundColor: currentStatus.color }]} />
              <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
              <Feather name="chevron-down" size={12} color={currentStatus.color} />
            </TouchableOpacity>
          </View>
          {showStatusPicker && (
            <View style={[styles.statusPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity key={s.value} style={[styles.statusOption, { borderBottomColor: colors.border }]}
                  onPress={async () => { await updateJob(job.id, { status: s.value }); setShowStatusPicker(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={[styles.statusOptionText, { color: s.color }]}>{s.label}</Text>
                  {job.status === s.value && <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={[styles.customerName, { color: colors.text }]}>{job.customerName}</Text>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{date}{job.scheduledTime ? ` · ${job.scheduledTime}` : ""}</Text>
          {!!job.address && <Text style={[styles.address, { color: colors.mutedForeground }]}>{job.address}</Text>}
        </View>

        {!!job.quoteId && (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/quote/[id]", params: { id: job.quoteId } } as any)}
            activeOpacity={0.85}
          >
            <View style={styles.linkedQuoteRow}>
              <Feather name="file-text" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>LINKED QUOTE</Text>
                <Text style={[styles.linkedQuoteTitle, { color: colors.text }]}>Open Related Quote</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        )}

        {!!job.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>NOTES</Text>
            <Text style={[styles.cardBody, { color: colors.text }]}>{job.notes}</Text>
          </View>
        )}

        {job.materials.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>MATERIALS ({orderedCount}/{job.materials.length} ordered)</Text>
            {job.materials.map((m) => (
              <TouchableOpacity key={m.id} style={styles.materialRow} onPress={() => toggleMaterial(m.id)}>
                <Feather name={m.ordered ? "check-square" : "square"} size={20} color={m.ordered ? "#10B981" : colors.mutedForeground} />
                <Text style={[styles.materialName, { color: m.ordered ? colors.mutedForeground : colors.text, textDecorationLine: m.ordered ? "line-through" : "none" }]}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>AI FOLLOW-UP MESSAGE</Text>
          <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>Generate a professional message to send to your customer</Text>
          {!followUpMessage ? (
            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: colors.primary }]} onPress={generateFollowUp} disabled={generatingFollowUp} activeOpacity={0.85}>
              {generatingFollowUp ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="cpu" size={16} color="#fff" />}
              <Text style={styles.generateBtnText}>{generatingFollowUp ? "Generating..." : "Generate Message"}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.messageBox}>
              <TextInput
                style={[styles.messageInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={followUpMessage} onChangeText={setFollowUpMessage}
                multiline textAlignVertical="top"
              />
              <View style={styles.messageActions}>
                <TouchableOpacity style={[styles.regenerateBtn, { borderColor: colors.border }]} onPress={generateFollowUp}>
                  <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareFollowUpBtn, { backgroundColor: colors.primary }]} onPress={() => Share.share({ message: followUpMessage })}>
                  <Feather name="send" size={15} color="#fff" />
                  <Text style={styles.shareFollowUpText}>Share Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 15, fontFamily: "Inter_500Medium" },
  scroll: { padding: 16, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroSection: { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  jobType: { fontSize: 13, fontFamily: "Inter_500Medium" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusPicker: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  statusOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  statusOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  customerName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  dateText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  address: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  cardHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  materialRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  materialName: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12, gap: 8 },
  generateBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  messageBox: { gap: 10 },
  messageInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 140, lineHeight: 22 },
  messageActions: { flexDirection: "row", gap: 8 },
  regenerateBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  shareFollowUpBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, gap: 6 },
  shareFollowUpText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },

  linkedQuoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkedQuoteTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
});
