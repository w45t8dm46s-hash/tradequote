import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCustomers } from "@/context/CustomersContext";
import { type Quote, useQuotes } from "@/context/QuotesContext";
import { useColors } from "@/hooks/useColors";

const JOB_TYPES = [
  { id: "rewire", label: "Rewire", icon: "zap" },
  { id: "sockets-switches", label: "Sockets & Switches", icon: "square" },
  { id: "lighting", label: "Lighting", icon: "sun" },
  { id: "consumer-unit", label: "Consumer Unit", icon: "shield" },
  { id: "ev-charger", label: "EV Charger", icon: "battery-charging" },
  { id: "fault-finding", label: "Fault Finding", icon: "search" },
  { id: "eicr", label: "EICR / Testing", icon: "clipboard" },
  { id: "smoke-alarms", label: "Smoke Alarms", icon: "bell" },
  { id: "other", label: "Other Electrical", icon: "tool" },
];

type Step = "type" | "details" | "generating" | "preview";

function generateId() { return Date.now().toString() + Math.random().toString(36).substr(2, 9); }
function generateQuoteNumber() {
  const year = new Date().getFullYear();
  return `QT-${year}-${Math.floor(Math.random() * 900) + 100}`;
}

interface PhotoAsset {
  uri: string;
  base64?: string | null;
}

export default function NewQuoteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addQuote } = useQuotes();
  const { customers } = useCustomers();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string; customerAddress?: string }>();
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<Step>("type");
  const [jobType, setJobType] = useState("");
  const [customerName, setCustomerName] = useState(params.customerName ?? "");
  const [customerAddress, setCustomerAddress] = useState(params.customerAddress ?? "");
  const [customerId, setCustomerId] = useState(params.customerId ?? "");
  const [description, setDescription] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [generatedQuote, setGeneratedQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const selectedType = JOB_TYPES.find((t) => t.id === jobType);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      const assets = result.assets.map((a) => ({ uri: a.uri, base64: a.base64 }));
      setPhotos((prev) => [...prev, ...assets].slice(0, 6));
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") { await pickImage(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64 }].slice(0, 6));
    }
  };

  const generateQuote = async () => {
    if (!customerName.trim() || !description.trim()) {
      setError("Please fill in customer name and job description.");
      return;
    }
    setError("");
    setStep("generating");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "";

      const photoBase64 = photos
        .filter((p) => p.base64)
        .map((p) => p.base64 as string);

      const token = await getToken();
      const response = await fetch(`${baseUrl}/api/quotes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          jobType: selectedType?.label ?? jobType,
          customerName,
          customerAddress,
          description,
          measurements,
          notes,
          photos: photoBase64,
        }),
      });

      if (response.status === 402) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.replace("/upgrade");
        return;
      }
      if (!response.ok) throw new Error("Failed to generate quote");
      const data = await response.json();

      const quote: Quote = {
        id: generateId(),
        jobType,
        jobTypeLabel: selectedType?.label ?? jobType,
        customerName,
        customerAddress,
        customerId: customerId || undefined,
        description,
        measurements,
        notes,
        photos: photos.map((p) => p.uri),
        status: "draft",
        createdAt: new Date().toISOString(),
        lineItems: data.lineItems,
        subtotal: data.subtotal,
        taxRate: data.taxRate,
        taxAmount: data.taxAmount,
        total: data.total,
        professionalSummary: data.professionalSummary,
        customerSummary: data.customerSummary,
        validDays: data.validDays ?? 30,
        quoteNumber: generateQuoteNumber(),
      };

      setGeneratedQuote(quote);
      setStep("preview");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      setStep("details");
      setError("Failed to generate quote. Please check your connection and try again.");
    }
  };

  const saveQuote = async () => {
    if (!generatedQuote) return;
    await addQuote(generatedQuote);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const updateStatus = async (status: Quote["status"]) => {
    if (!generatedQuote) return;
    const updated = { ...generatedQuote, status };
    setGeneratedQuote(updated);
    await addQuote(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const bottomPad = isWeb ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

      {step === "type" && (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>What type of job?</Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>Select the electrical work that best fits this quote</Text>
          <View style={styles.typeGrid}>
            {JOB_TYPES.map((t) => {
              const active = jobType === t.id;
              return (
                <TouchableOpacity key={t.id}
                  style={[styles.typeCard, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => { setJobType(t.id); Haptics.selectionAsync(); }}
                  activeOpacity={0.75}
                >
                  <Feather name={t.icon as any} size={24} color={active ? "#fff" : colors.primary} />
                  <Text style={[styles.typeLabel, { color: active ? "#fff" : colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: jobType ? colors.primary : colors.muted }]}
            onPress={() => jobType && setStep("details")}
            disabled={!jobType} activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: jobType ? "#fff" : colors.mutedForeground }]}>Continue</Text>
            <Feather name="arrow-right" size={18} color={jobType ? "#fff" : colors.mutedForeground} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {step === "details" && (
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          bottomOffset={16} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backRow} onPress={() => setStep("type")}>
            <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Change job type</Text>
          </TouchableOpacity>

          <Text style={[styles.stepTitle, { color: colors.text }]}>Job Details</Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>The more detail you give, the more accurate your quote</Text>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Customer Name *</Text>
            {customers.length > 0 && (
              <TouchableOpacity
                style={[styles.customerPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowCustomerPicker(!showCustomerPicker)}
              >
                <Feather name="users" size={15} color={colors.primary} />
                <Text style={[styles.customerPickerText, { color: colors.primary }]}>Pick existing customer</Text>
                <Feather name={showCustomerPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
            {showCustomerPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {customers.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.dropItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setCustomerName(c.name); setCustomerAddress(c.address); setCustomerId(c.id); setShowCustomerPicker(false); }}>
                    <Text style={[styles.dropText, { color: colors.text }]}>{c.name}</Text>
                    {c.address ? <Text style={[styles.dropSub, { color: colors.mutedForeground }]}>{c.address}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. John Smith"
              placeholderTextColor={colors.mutedForeground}
              value={customerName}
              onChangeText={(v) => { setCustomerName(v); setCustomerId(""); }}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Customer Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 14 Oak Street, Manchester"
              placeholderTextColor={colors.mutedForeground}
              value={customerAddress}
              onChangeText={setCustomerAddress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Job Description *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the work to be done..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline numberOfLines={4} textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Measurements / Quantities</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 8 double sockets, 12m cable run, 3 light fittings..."
              placeholderTextColor={colors.mutedForeground}
              value={measurements}
              onChangeText={setMeasurements}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Additional Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Access issues, materials specified, timeline..."
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Photos ({photos.length}/6){photos.length > 0 ? " — AI will analyse these" : ""}
            </Text>
            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri: p.uri }} style={styles.photoImg} contentFit="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Feather name="x" size={12} color="#fff" />
                  </TouchableOpacity>
                  {p.base64 && (
                    <View style={styles.photoReady}>
                      <Feather name="cpu" size={9} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
              {photos.length < 6 && (
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={[styles.photoAdd, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={takePhoto}>
                    <Feather name="camera" size={20} color={colors.primary} />
                    <Text style={[styles.photoAddText, { color: colors.primary }]}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoAdd, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
                    <Feather name="image" size={20} color={colors.primary} />
                    <Text style={[styles.photoAddText, { color: colors.primary }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {photos.length > 0 && (
              <Text style={[styles.photoHint, { color: colors.primary }]}>
                Claude Vision will analyse your photos to identify materials
              </Text>
            )}
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={generateQuote} activeOpacity={0.85}>
            <Feather name="cpu" size={18} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Generate Quote with AI</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}

      {step === "generating" && (
        <View style={styles.generatingContainer}>
          <View style={[styles.generatingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.generatingTitle, { color: colors.text }]}>Creating your quote...</Text>
            <Text style={[styles.generatingText, { color: colors.mutedForeground }]}>
              {photos.length > 0
                ? "AI is analysing your photos and job details to build a precise quote"
                : "AI is analysing your job details and building a professional quote"}
            </Text>
          </View>
        </View>
      )}

      {step === "preview" && generatedQuote && (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
          <View style={styles.previewHeader}>
            <View style={[styles.previewBadge, { backgroundColor: colors.secondary }]}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.previewBadgeText, { color: colors.primary }]}>Quote Generated</Text>
            </View>
            <Text style={[styles.quoteNumber, { color: colors.mutedForeground }]}>{generatedQuote.quoteNumber}</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREPARED FOR</Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{generatedQuote.customerName}</Text>
            {generatedQuote.customerAddress ? <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{generatedQuote.customerAddress}</Text> : null}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SCOPE OF WORK</Text>
            <Text style={[styles.summaryText, { color: colors.text }]}>{generatedQuote.customerSummary}</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LINE ITEMS</Text>
            {generatedQuote.lineItems.map((item, i) => (
              <View key={i} style={[styles.lineItem, i < generatedQuote.lineItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={styles.lineItemLeft}>
                  <Text style={[styles.lineItemDesc, { color: colors.text }]}>{item.description}</Text>
                  <Text style={[styles.lineItemMeta, { color: colors.mutedForeground }]}>{item.quantity} {item.unit} × £{item.rate.toFixed(2)}</Text>
                </View>
                <Text style={[styles.lineItemTotal, { color: colors.text }]}>£{item.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text><Text style={[styles.totalValue, { color: colors.text }]}>£{generatedQuote.subtotal.toFixed(2)}</Text></View>
            <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>VAT ({generatedQuote.taxRate}%)</Text><Text style={[styles.totalValue, { color: colors.text }]}>£{generatedQuote.taxAmount.toFixed(2)}</Text></View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary }]}>£{generatedQuote.total.toFixed(2)}</Text>
            </View>
            <Text style={[styles.validText, { color: colors.mutedForeground }]}>Valid for {generatedQuote.validDays} days</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={saveQuote} activeOpacity={0.8}>
              <Feather name="save" size={16} color={colors.text} />
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={() => updateStatus("sent")} activeOpacity={0.85}>
              <Feather name="send" size={16} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Mark as Sent</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  scrollContent: { padding: 20, gap: 16 },
  stepTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  stepSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -8 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: { width: "30%", flexGrow: 1, alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 8 },
  typeLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: -4 },
  backText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  customerPickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  customerPickerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  dropItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  dropText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  dropSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 90 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 10, overflow: "hidden" },
  photoImg: { width: 80, height: 80 },
  photoRemove: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 3 },
  photoReady: { position: "absolute", bottom: 4, left: 4, backgroundColor: "#10B981", borderRadius: 8, padding: 3 },
  photoHint: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  photoButtons: { flexDirection: "row", gap: 8 },
  photoAdd: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  photoAddText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8 },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", flex: 1 },
  generatingContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  generatingCard: { width: "100%", padding: 40, borderRadius: 20, alignItems: "center", gap: 16 },
  generatingTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  generatingText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: -4 },
  previewBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  previewBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  quoteNumber: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  sectionValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  lineItem: { paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemDesc: { fontSize: 14, fontFamily: "Inter_500Medium" },
  lineItemMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lineItemTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  totalValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  grandTotalRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  grandTotalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  grandTotalValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  validText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  actionButtons: { flexDirection: "row", gap: 10 },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 14, gap: 8, borderWidth: 1, paddingHorizontal: 20 },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
