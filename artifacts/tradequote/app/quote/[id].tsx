import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Modal, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type QuoteStatus, useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";

const STATUS_OPTIONS: { value: QuoteStatus; label: string; icon: string; color: string }[] = [
  { value: "draft", label: "Draft", icon: "file", color: "#6B7280" },
  { value: "sent", label: "Sent", icon: "send", color: "#3B82F6" },
  { value: "accepted", label: "Accepted", icon: "check-circle", color: "#10B981" },
  { value: "declined", label: "Declined", icon: "x-circle", color: "#EF4444" },
];

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getQuote, updateQuote, deleteQuote } = useQuotes();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const quote = getQuote(id);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!quote) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>Quote not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === quote.status) ?? STATUS_OPTIONS[0];

  const handleShare = async () => {
    const lineItemsText = quote.lineItems
      .map((item) => `• ${item.description}: ${item.quantity} ${item.unit} × £${item.rate.toFixed(2)} = £${item.total.toFixed(2)}`)
      .join("\n");
    const text = `QUOTE ${quote.quoteNumber}\n\nPrepared for: ${quote.customerName}\n${quote.customerAddress ? `Address: ${quote.customerAddress}\n` : ""}\n${quote.customerSummary}\n\nLINE ITEMS:\n${lineItemsText}\n\nSubtotal: £${quote.subtotal.toFixed(2)}\nVAT (${quote.taxRate}%): £${quote.taxAmount.toFixed(2)}\nTOTAL: £${quote.total.toFixed(2)}\n\nValid for ${quote.validDays} days.`;
    await Share.share({ message: text, title: `Quote for ${quote.customerName}` });
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteQuote(quote.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  const changeStatus = async (status: QuoteStatus) => {
    await updateQuote(quote.id, { status });
    setShowStatusPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const date = new Date(quote.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleShare}>
              <Feather name="share-2" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]} onPress={handleDelete}>
              <Feather name="trash-2" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.quoteMetaRow}>
            <Text style={[styles.quoteNumberText, { color: colors.mutedForeground }]}>{quote.quoteNumber}</Text>
            <TouchableOpacity style={[styles.statusBadge, { backgroundColor: currentStatus.color + "18" }]} onPress={() => setShowStatusPicker(!showStatusPicker)}>
              <Feather name={currentStatus.icon as any} size={12} color={currentStatus.color} />
              <Text style={[styles.statusBadgeText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
              <Feather name="chevron-down" size={12} color={currentStatus.color} />
            </TouchableOpacity>
          </View>

          {showStatusPicker && (
            <View style={[styles.statusPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity key={s.value} style={[styles.statusOption, { borderBottomColor: colors.border }]} onPress={() => changeStatus(s.value)}>
                  <Feather name={s.icon as any} size={16} color={s.color} />
                  <Text style={[styles.statusOptionText, { color: colors.text }]}>{s.label}</Text>
                  {quote.status === s.value && <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.customerNameLarge, { color: colors.text }]}>{quote.customerName}</Text>
          {quote.customerAddress ? <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{quote.customerAddress}</Text> : null}
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{date} · {quote.jobTypeLabel}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>SCOPE OF WORK</Text>
          <Text style={[styles.cardBody, { color: colors.text }]}>{quote.customerSummary}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>LINE ITEMS</Text>
          {quote.lineItems.map((item, i) => (
            <View key={i} style={[styles.lineItem, i < quote.lineItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={styles.lineItemLeft}>
                <Text style={[styles.lineItemDesc, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.lineItemMeta, { color: colors.mutedForeground }]}>{item.quantity} {item.unit} × £{item.rate.toFixed(2)}</Text>
              </View>
              <Text style={[styles.lineItemTotal, { color: colors.text }]}>£{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>£{quote.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>VAT ({quote.taxRate}%)</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>£{quote.taxAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandValue, { color: colors.primary }]}>£{quote.total.toFixed(2)}</Text>
          </View>
          <Text style={[styles.validNote, { color: colors.mutedForeground }]}>Valid for {quote.validDays} days from {date}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push({ pathname: "/new-invoice", params: { quoteId: quote.id } })}
            activeOpacity={0.8}
          >
            <Feather name="file-plus" size={16} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Create Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push({
              pathname: "/new-job",
              params: {
                quoteId: quote.id,
                customerId: quote.customerId ?? "",
                customerName: quote.customerName,
                address: quote.customerAddress ?? "",
                materials: JSON.stringify(quote.lineItems.map((li) => ({ name: li.description, quantity: li.quantity, unit: li.unit }))),
              },
            })}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={16} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Schedule Job</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.shareFullBtn, { backgroundColor: colors.primary }]} onPress={handleShare} activeOpacity={0.85}>
          <Feather name="share-2" size={18} color="#fff" />
          <Text style={styles.shareFullBtnText}>Share Quote</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Quote</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>This will permanently remove this quote. Are you sure?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setShowDeleteConfirm(false)} activeOpacity={0.8}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#EF4444", borderColor: "#EF4444" }]} onPress={confirmDelete} activeOpacity={0.85}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, padding: 20, borderRadius: 14, borderWidth: 1, gap: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  modalBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  backLink: { fontSize: 15, fontFamily: "Inter_500Medium" },
  scroll: { padding: 16, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  backBtn: { padding: 4 },
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroSection: { gap: 6, marginBottom: 8 },
  quoteMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quoteNumberText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusPicker: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  statusOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  statusOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  customerNameLarge: { fontSize: 26, fontFamily: "Inter_700Bold", marginTop: 4 },
  addressText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dateText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  lineItem: { paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  lineItemMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lineItemTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  grandRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  grandLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grandValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  validNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, gap: 6 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareFullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  shareFullBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
