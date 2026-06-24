import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type InvoiceStatus, useInvoices } from "@/context/InvoicesContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

const STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: "draft", label: "Draft", color: "#6B7280" },
  { value: "sent", label: "Sent", color: "#3B82F6" },
  { value: "partial", label: "Part Paid", color: "#F59E0B" },
  { value: "paid", label: "Paid", color: "#10B981" },
  { value: "overdue", label: "Overdue", color: "#EF4444" },
];

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const invoice = getInvoice(id);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  if (!invoice) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.text }]}>Invoice not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={[styles.link, { color: colors.primary }]}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === invoice.status) ?? STATUS_OPTIONS[0];
  const outstanding = invoice.total - invoice.paidAmount;
  const dueDate = new Date(invoice.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const recordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    const newPaid = Math.min(invoice.paidAmount + amt, invoice.total);
    const newStatus: InvoiceStatus = newPaid >= invoice.total ? "paid" : "partial";
    await updateInvoice(invoice.id, { paidAmount: newPaid, status: newStatus });
    setShowPaymentInput(false);
    setPaymentAmount("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShare = async () => {
    const lines = invoice.lineItems.map((i) => `• ${i.description}: ${i.quantity} ${i.unit} × £${i.rate.toFixed(2)} = £${i.total.toFixed(2)}`).join("\n");
    const text = `INVOICE ${invoice.invoiceNumber}\n\nBilled to: ${invoice.customerName}\nDue: ${dueDate}\n\n${lines}\n\nSubtotal: £${invoice.subtotal.toFixed(2)}\nVAT: £${invoice.taxAmount.toFixed(2)}\nTOTAL: £${invoice.total.toFixed(2)}\nPaid: £${invoice.paidAmount.toFixed(2)}\nOutstanding: £${outstanding.toFixed(2)}`;
    await Share.share({ message: text });
  };

  const handleDelete = () => {
    Alert.alert("Delete Invoice", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteInvoice(invoice.id); router.back(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 34 : insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={20} color={colors.text} /></TouchableOpacity>
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
          <View style={styles.metaRow}>
            <Text style={[styles.invNumber, { color: colors.mutedForeground }]}>{invoice.invoiceNumber}</Text>
            <TouchableOpacity style={[styles.statusBadge, { backgroundColor: currentStatus.color + "18" }]} onPress={() => setShowStatusPicker(!showStatusPicker)}>
              <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
              <Feather name="chevron-down" size={12} color={currentStatus.color} />
            </TouchableOpacity>
          </View>
          {showStatusPicker && (
            <View style={[styles.statusPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity key={s.value} style={[styles.statusOption, { borderBottomColor: colors.border }]}
                  onPress={async () => { await updateInvoice(invoice.id, { status: s.value }); setShowStatusPicker(false); }}>
                  <Text style={[styles.statusOptionText, { color: s.color }]}>{s.label}</Text>
                  {invoice.status === s.value && <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={[styles.customerName, { color: colors.text }]}>{invoice.customerName}</Text>
          <Text style={[styles.dueText, { color: colors.mutedForeground }]}>Due {dueDate}</Text>
        </View>

        {invoice.status !== "paid" && outstanding > 0 && (
          <View style={[styles.paymentBanner, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
            <View>
              <Text style={[styles.paymentLabel, { color: "#92400E" }]}>Outstanding</Text>
              <Text style={[styles.paymentAmount, { color: "#92400E" }]}>£{outstanding.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={[styles.payBtn, { backgroundColor: "#10B981" }]} onPress={() => setShowPaymentInput(!showPaymentInput)}>
              <Text style={styles.payBtnText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {showPaymentInput && (
          <View style={[styles.paymentInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.amtInput, { borderColor: colors.border, color: colors.text }]}
              placeholder={`Amount (max £${outstanding.toFixed(2)})`}
              placeholderTextColor={colors.mutedForeground}
              value={paymentAmount} onChangeText={setPaymentAmount}
              keyboardType="decimal-pad" autoFocus
            />
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: "#10B981" }]} onPress={recordPayment}>
              <Feather name="check" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>LINE ITEMS</Text>
          {invoice.lineItems.map((item, i) => (
            <View key={i} style={[styles.lineItem, i < invoice.lineItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineDesc, { color: colors.text }]}>{item.description}</Text>
                <Text style={[styles.lineMeta, { color: colors.mutedForeground }]}>{item.quantity} {item.unit} × £{item.rate.toFixed(2)}</Text>
              </View>
              <Text style={[styles.lineTotal, { color: colors.text }]}>£{item.total.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text><Text style={[styles.totalVal, { color: colors.text }]}>£{invoice.subtotal.toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>VAT ({invoice.taxRate}%)</Text><Text style={[styles.totalVal, { color: colors.text }]}>£{invoice.taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.totalRow, styles.grandRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandVal, { color: colors.primary }]}>£{invoice.total.toFixed(2)}</Text>
          </View>
          {invoice.paidAmount > 0 && (
            <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: "#10B981" }]}>Paid</Text><Text style={[styles.totalVal, { color: "#10B981" }]}>£{invoice.paidAmount.toFixed(2)}</Text></View>
          )}
        </View>

        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={handleShare} activeOpacity={0.85}>
          <Feather name="share-2" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>Share Invoice</Text>
        </TouchableOpacity>
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
  topActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroSection: { gap: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  invNumber: { fontSize: 13, fontFamily: "Inter_500Medium" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusPicker: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  statusOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  statusOptionText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  customerName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 },
  dueText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  paymentBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 14, borderWidth: 1 },
  paymentLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  paymentAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  payBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  payBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  paymentInput: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  amtInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  confirmBtn: { width: 46, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  cardLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  lineItem: { paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lineDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  lineMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lineTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalVal: { fontSize: 14, fontFamily: "Inter_500Medium" },
  grandRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grandVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  shareBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
