import React, { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { type BusinessSettings, useSettings } from "@/context/SettingsContext";
import TradePicker from "@/components/TradePicker";
import BottomNav from "@/components/BottomNav";
import { TRADES, getTradeById } from "@/lib/trades";

const BRAND_PRESETS = ["#FF6B35", "#2563EB", "#16A34A", "#0F172A", "#9333EA", "#DC2626"];

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, loading } = useSettings();
  const [local, setLocal] = useState<BusinessSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [showTradePicker, setShowTradePicker] = useState(false);

  useEffect(() => { if (!loading) setLocal(settings); }, [loading, settings]);

  const set = <K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) => setLocal((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    await updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType || "image/png";
      set("logoDataUri", `data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAFAFA" }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#111" />
        </Pressable>
        <Text style={styles.topTitle}>Business Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <TradePicker visible={showTradePicker} onDismiss={() => setShowTradePicker(false)} />

      <Text style={styles.lede}>These details appear on the PDF quotes you send to customers. Set your hourly rate so AI-generated quotes match the way you work.</Text>

      <Section title="Your trade">
        <TradeRow trade={settings.trade} onPress={() => setShowTradePicker(true)} />
      </Section>

      <Section title="Branding">
        <View style={styles.logoRow}>
          {local.logoDataUri ? (
            <Image source={{ uri: local.logoDataUri }} style={styles.logoPreview} contentFit="contain" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: local.brandColor }]}>
              <Text style={styles.logoPlaceholderText}>{(local.businessName?.[0] || "Q").toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 8 }}>
            <Pressable style={styles.outlineBtn} onPress={pickLogo}>
              <Feather name="upload" size={14} color="#111" />
              <Text style={styles.outlineBtnText}>{local.logoDataUri ? "Replace logo" : "Upload logo"}</Text>
            </Pressable>
            {local.logoDataUri ? (
              <Pressable style={styles.outlineBtn} onPress={() => set("logoDataUri", "")}>
                <Feather name="x" size={14} color="#EF4444" />
                <Text style={[styles.outlineBtnText, { color: "#EF4444" }]}>Remove logo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Field label="Brand colour">
          <View style={styles.colourRow}>
            {BRAND_PRESETS.map((c) => (
              <Pressable key={c} onPress={() => set("brandColor", c)}
                style={[styles.swatch, { backgroundColor: c }, local.brandColor === c && styles.swatchActive]}
              />
            ))}
          </View>
        </Field>
      </Section>

      <Section title="Business details">
        <Field label="Business / trading name"><Input value={local.businessName} onChangeText={(v) => set("businessName", v)} placeholder="e.g. Smith Electrical Ltd" /></Field>
        <Field label="Tagline / trading as"><Input value={local.tradingAs} onChangeText={(v) => set("tradingAs", v)} placeholder="e.g. Trusted electricians in Manchester" /></Field>
        <Field label="Address"><Input value={local.address} onChangeText={(v) => set("address", v)} placeholder="e.g. 12 High Street, Manchester M1 2AB" multiline numberOfLines={2} /></Field>
        <View style={styles.twoCol}>
          <Field label="Phone" flex><Input value={local.phone} onChangeText={(v) => set("phone", v)} placeholder="07700 900000" keyboardType="phone-pad" /></Field>
          <Field label="Email" flex><Input value={local.email} onChangeText={(v) => set("email", v)} placeholder="hello@yourbiz.co.uk" keyboardType="email-address" autoCapitalize="none" /></Field>
        </View>
        <Field label="Website"><Input value={local.website} onChangeText={(v) => set("website", v)} placeholder="yourbiz.co.uk" autoCapitalize="none" /></Field>
      </Section>

      <Section title="Pricing">
        <View style={styles.twoCol}>
          <Field label="Hourly labour rate (£)" flex>
            <Input value={String(local.labourRate ?? "")} onChangeText={(v) => set("labourRate", Number(v.replace(/[^\d.]/g, "")) || 0)} keyboardType="decimal-pad" placeholder="55" />
          </Field>
          <Field label="Default quote validity (days)" flex>
            <Input value={String(local.validDays ?? "")} onChangeText={(v) => set("validDays", Math.max(1, Math.min(365, parseInt(v.replace(/\D/g, ""), 10) || 30)))} keyboardType="number-pad" placeholder="30" />
          </Field>
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>VAT registered</Text>
            <Text style={styles.hint}>If on, VAT is added to quotes at the rate below.</Text>
          </View>
            <Pressable onPress={() => set("vatRegistered", !local.vatRegistered)} style={{ backgroundColor: local.vatRegistered ? local.brandColor : "#E5E7EB", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22 }}><Text style={{ color: local.vatRegistered ? "#fff" : "#111", fontWeight: "700" }}>{local.vatRegistered ? "Yes" : "No"}</Text></Pressable>
        </View>
        {local.vatRegistered && (
          <View style={styles.twoCol}>
            <Field label="VAT rate (%)" flex><Input value={String(local.vatRate ?? "")} onChangeText={(v) => set("vatRate", Number(v.replace(/[^\d.]/g, "")) || 0)} keyboardType="decimal-pad" placeholder="20" /></Field>
            <Field label="VAT number" flex><Input value={local.vatNumber} onChangeText={(v) => set("vatNumber", v)} placeholder="GB123456789" autoCapitalize="characters" /></Field>
          </View>
        )}
        <Field label="Payment terms (shown on PDF)">
          <Input value={local.paymentTerms} onChangeText={(v) => set("paymentTerms", v)} placeholder="Payment due within 14 days of invoice." multiline numberOfLines={2} />
        </Field>
      </Section>

      <Section title="Credentials (optional)">
        <View style={styles.twoCol}>
          <Field label="Company number" flex><Input value={local.companyNumber} onChangeText={(v) => set("companyNumber", v)} placeholder="12345678" /></Field>
          <Field label="NICEIC / Part P" flex><Input value={local.niceicNumber} onChangeText={(v) => set("niceicNumber", v)} placeholder="Reg. number" /></Field>
        </View>
        <Field label="Compliance footer (shown at bottom of PDF)">
          <Input value={local.footerNote} onChangeText={(v) => set("footerNote", v)} multiline numberOfLines={3} />
        </Field>
      </Section>

      <Section title="Bank details (optional)">
        <Field label="Bank name"><Input value={local.bankName} onChangeText={(v) => set("bankName", v)} placeholder="e.g. Barclays" /></Field>
        <View style={styles.twoCol}>
          <Field label="Sort code" flex><Input value={local.bankSortCode} onChangeText={(v) => set("bankSortCode", v)} placeholder="12-34-56" /></Field>
          <Field label="Account no." flex><Input value={local.bankAccount} onChangeText={(v) => set("bankAccount", v)} placeholder="12345678" keyboardType="number-pad" /></Field>
        </View>
      </Section>

      <Pressable style={[styles.saveBtn, { backgroundColor: local.brandColor }]} onPress={handleSave}>
        <Feather name="check" size={16} color="#fff" />
        <Text style={styles.saveBtnText}>{saved ? "Saved" : "Save settings"}</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function TradeRow({ trade, onPress }: { trade: string; onPress: () => void }) {
  const current = getTradeById(trade) ?? TRADES[0];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: 28 }}>{current.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#111" }}>{current.label}</Text>
        <Text style={{ fontSize: 12, color: "#888", marginTop: 1 }}>Tap to change trade</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} style={[styles.input, props.multiline && styles.inputMulti]} placeholderTextColor="#9CA3AF" />;
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 6 },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  lede: { color: "#555", fontSize: 13, lineHeight: 19, marginBottom: 18 },
  section: { backgroundColor: "#fff", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#EAEAEA", marginBottom: 14, gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  hint: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10, fontSize: 14, color: "#111", backgroundColor: "#fff" },
  inputMulti: { minHeight: 64, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  logoRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  logoPreview: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  logoPlaceholder: { width: 64, height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoPlaceholderText: { color: "#fff", fontSize: 26, fontWeight: "700" },
  outlineBtn: { borderWidth: 1, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#fff" },
  outlineBtnText: { color: "#111", fontSize: 13, fontWeight: "600" },
  colourRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: "#111" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 12, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
