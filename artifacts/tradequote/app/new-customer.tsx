import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Customer, useCustomers } from "@/context/CustomersContext";
import { useColors } from "@/hooks/useColors";
import BottomNav from "@/components/BottomNav";

function genId() { return Date.now().toString() + Math.random().toString(36).substr(2, 9); }

export default function NewCustomerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addCustomer } = useCustomers();
  const isWeb = Platform.OS === "web";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const customer: Customer = {
      id: genId(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await addCustomer(customer);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/customers" as any);
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e?.message ?? "Failed to save customer. Please try again.");
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: isWeb ? 100 : insets.bottom + 90 }]}
        bottomOffset={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>New Customer</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Save their details for future quotes and jobs</Text>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={15} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {[
          { label: "Full Name *", value: name, setter: setName, placeholder: "e.g. Sarah Johnson", autoCapitalize: "words" as const, keyboardType: "default" as const },
          { label: "Phone", value: phone, setter: setPhone, placeholder: "e.g. 07700 900123", autoCapitalize: "none" as const, keyboardType: "phone-pad" as const },
          { label: "Email", value: email, setter: setEmail, placeholder: "e.g. sarah@email.com", autoCapitalize: "none" as const, keyboardType: "email-address" as const },
          { label: "Address", value: address, setter: setAddress, placeholder: "e.g. 22 High Street, Leeds", autoCapitalize: "words" as const, keyboardType: "default" as const },
        ].map((f) => (
          <View key={f.label} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{f.label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder={f.placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={f.value}
              onChangeText={f.setter}
              autoCapitalize={f.autoCapitalize}
              keyboardType={f.keyboardType}
            />
          </View>
        ))}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Any notes about this customer..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.65 : 1 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Feather name={saving ? "loader" : "user-plus"} size={18} color="#fff" />
          <Text style={styles.btnText}>{saving ? "Saving..." : "Save Customer"}</Text>
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
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -6 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
