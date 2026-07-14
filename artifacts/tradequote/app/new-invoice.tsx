import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomers } from "@/context/CustomersContext";
import { type Invoice, useInvoices } from "@/context/InvoicesContext";
import { type LineItem, useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 9); }
function genInvNum() { return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`; }

export default function NewInvoiceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addInvoice } = useInvoices();
  const { quotes } = useQuotes();
  const { customers } = useCustomers();
  const params = useLocalSearchParams<{ quoteId?: string; customerId?: string }>();
  const isWeb = Platform.OS === "web";

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [daysUntilDue, setDaysUntilDue] = useState("30");
  const [depositAmount, setDepositAmount] = useState("0");
  const [quoteId, setQuoteId] = useState(params.quoteId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit: "hrs", rate: 0, total: 0 },
  ]);

  useEffect(() => {
    if (params.quoteId) {
      const q = quotes.find((q) => q.id === params.quoteId);
      if (q) {
        setCustomerName(q.customerName);
        setCustomerAddress(q.customerAddress);
        setLineItems(q.lineItems);
        setQuoteId(q.id);
        if (q.customerId) setCustomerId(q.customerId);
      }
    } else if (params.customerId) {
      const c = customers.find((c) => c.id === params.customerId);
      if (c) { setCustomerName(c.name); setCustomerAddress(c.address); setCustomerId(c.id); }
    }
  }, []);

  const updateItem = (i: number, field: keyof LineItem, val: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[i] };
      if (field === "description" || field === "unit") { (item as any)[field] = val; }
      else { (item as any)[field] = parseFloat(val) || 0; }
      item.total = item.quantity * item.rate;
      next[i] = item;
      return next;
    });
  };

  const addItem = () => setLineItems((p) => [...p, { description: "", quantity: 1, unit: "hrs", rate: 0, total: 0 }]);
  const removeItem = (i: number) => setLineItems((p) => p.filter((_, idx) => idx !== i));

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * 0.2;
  const total = subtotal + taxAmount;

  const save = async () => {
    if (saving) return;
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (parseInt(daysUntilDue, 10) || 30));
      const dep = parseFloat(depositAmount) || 0;
      const invoice: Invoice = {
        id: genId(), invoiceNumber: genInvNum(), customerId, customerName, customerAddress,
        quoteId: quoteId || undefined, lineItems, subtotal, taxRate: 20, taxAmount, total,
        status: "draft", dueDate: dueDate.toISOString(), createdAt: new Date().toISOString(),
        paidAmount: dep, depositAmount: dep, notes,
      };
      await addInvoice(invoice);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(tabs)/finance" as any);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create invoice.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 100 : insets.bottom + 90 }]}
        bottomOffset={16} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>New Invoice</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Customer Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Customer name" placeholderTextColor={colors.mutedForeground}
            value={customerName} onChangeText={setCustomerName} autoCapitalize="words" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Customer Address</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Address" placeholderTextColor={colors.mutedForeground}
            value={customerAddress} onChangeText={setCustomerAddress} autoCapitalize="words" />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Due (days)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="30" placeholderTextColor={colors.mutedForeground}
              value={daysUntilDue} onChangeText={setDaysUntilDue} keyboardType="numeric" />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Deposit Paid (£)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00" placeholderTextColor={colors.mutedForeground}
              value={depositAmount} onChangeText={setDepositAmount} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Line Items</Text>
            <TouchableOpacity onPress={addItem}>
              <Text style={[styles.addLink, { color: colors.primary }]}>+ Add item</Text>
            </TouchableOpacity>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={[styles.lineItemBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.lineItemTop}>
                <TextInput style={[styles.lineItemDesc, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Description" placeholderTextColor={colors.mutedForeground}
                  value={item.description} onChangeText={(v) => updateItem(i, "description", v)} />
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(i)}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.lineItemRow}>
                <TextInput style={[styles.miniInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Qty" placeholderTextColor={colors.mutedForeground}
                  value={item.quantity ? String(item.quantity) : ""} onChangeText={(v) => updateItem(i, "quantity", v)} keyboardType="decimal-pad" />
                <TextInput style={[styles.miniInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Unit" placeholderTextColor={colors.mutedForeground}
                  value={item.unit} onChangeText={(v) => updateItem(i, "unit", v)} />
                <TextInput style={[styles.miniInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Rate £" placeholderTextColor={colors.mutedForeground}
                  value={item.rate ? String(item.rate) : ""} onChangeText={(v) => updateItem(i, "rate", v)} keyboardType="decimal-pad" />
                <Text style={[styles.lineTotal, { color: colors.text }]}>£{item.total.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.totalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text><Text style={[styles.totalVal, { color: colors.text }]}>£{subtotal.toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>VAT (20%)</Text><Text style={[styles.totalVal, { color: colors.text }]}>£{taxAmount.toFixed(2)}</Text></View>
          <View style={[styles.totalRow, styles.grandRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.grandVal, { color: colors.primary }]}>£{total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Payment terms, bank details, etc." placeholderTextColor={colors.mutedForeground}
            value={notes} onChangeText={setNotes} multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Feather name="file-plus" size={18} color="#fff" />
          <Text style={styles.btnText}>{saving ? "Saving..." : "Create Invoice"}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", gap: 10 },
  fieldGroup: { gap: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  lineItemBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 8 },
  lineItemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  lineItemDesc: { flex: 1, borderBottomWidth: 1, paddingBottom: 4, fontSize: 14, fontFamily: "Inter_400Regular" },
  lineItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  lineTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 60, textAlign: "right" },
  totalBox: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalVal: { fontSize: 14, fontFamily: "Inter_500Medium" },
  grandRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grandVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  errorText: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular" },
});
