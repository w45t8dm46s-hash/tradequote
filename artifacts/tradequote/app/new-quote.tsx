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

import { getApiBaseUrl } from "@/lib/api";

import { useCustomers } from "@/context/CustomersContext";
import { type Quote, useQuotes } from "@/context/QuotesContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { usePlan } from "@/hooks/usePlan";

import { TRADES, getTradeById } from "@/lib/trades";
import BottomNav from "@/components/BottomNav";
import UpgradePrompt from "@/components/UpgradePrompt";

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
  const { settings, updateSettings } = useSettings();
  const { getToken } = useAuth();
  const { isPro } = usePlan();
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
  const [manualSaving, setManualSaving] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [improvingDescription, setImprovingDescription] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  const currentTrade = getTradeById(settings.trade) ?? TRADES[0];
  const JOB_TYPES = currentTrade.jobTypes;
  const selectedType = JOB_TYPES.find((t) => t.id === jobType);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled) {
      const assets = result.assets.map((a) => ({ uri: a.uri, base64: a.base64 }));
      setPhotos((prev) => [...prev, ...assets].slice(0, 3));
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") { await pickImage(); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, { uri: result.assets[0].uri, base64: result.assets[0].base64 }].slice(0, 3));
    }
  };

  const generateQuote = async () => {
    if (!isPro) {
      setUpgradeFeature("AI quote generation");
      return;
    }

    if (!customerName.trim() || !description.trim()) {
      setError("Please fill in customer name and job description.");
      return;
    }
    setError("");
    setStep("generating");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const baseUrl = getApiBaseUrl();

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
          trade: currentTrade.id,
          tradeLabel: currentTrade.label,
          tradePromptContext: currentTrade.promptContext,
          tradeTypicalItems: currentTrade.typicalItems,
          jobType: selectedType?.label ?? jobType,
          customerName,
          customerAddress,
          description,
          measurements,
          notes,
          photos: photoBase64,
          labourRate: settings.labourRate || undefined,
          vatRate: settings.vatRegistered ? (settings.vatRate ?? 20) : 0,
          vatRegistered: settings.vatRegistered,
          validDays: settings.validDays || undefined,
        }),
      });

      if (response.status === 402) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.replace("/upgrade");
        return;
      }
      if (!response.ok) {
        let serverMsg = `Server responded ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.error) serverMsg = errBody.error;
          if (errBody?.message) serverMsg = errBody.message;
        } catch {}
        throw new Error(serverMsg);
      }
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
    } catch (e: any) {
      console.error(e);
      setStep("details");
      const rawMsg = String(e?.message ?? "");
      const aiKeyProblem = rawMsg.toLowerCase().includes("api-key") || rawMsg.toLowerCase().includes("x-api-key");

      if (aiKeyProblem) {
        await updateSettings({ aiAssistanceEnabled: false });
        setError("AI is not configured yet, so it has been switched off. You can still create a manual quote.");
      } else {
        const msg = rawMsg ? `Failed to generate quote: ${rawMsg}` : "Failed to generate quote. Please check your connection and try again.";
        setError(msg);
      }
    }
  };


  const improveDescription = async () => {
    if (!isPro) {
      setUpgradeFeature("AI improve wording");
      return;
    }

    if (!settings.aiAssistanceEnabled || improvingDescription) return;

    if (!description.trim()) {
      setError("Add rough job description first.");
      return;
    }

    setImprovingDescription(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(`${getApiBaseUrl()}/api/ai/improve-wording`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: description,
          context: `${currentTrade.label} quote. ${selectedType?.label ?? ""}. Improve the customer-facing job description only. Do not add prices.`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to improve wording.");
      }

      if (data?.improvedText) {
        setDescription(String(data.improvedText).trim());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e: any) {
      const rawMsg = String(e?.message ?? "");
      const aiKeyProblem = rawMsg.toLowerCase().includes("api-key") || rawMsg.toLowerCase().includes("x-api-key");

      if (aiKeyProblem) {
        await updateSettings({ aiAssistanceEnabled: false });
        setError("AI is not configured yet, so it has been switched off. You can still create a manual quote.");
      } else {
        setError(rawMsg || "Failed to improve wording.");
      }
    } finally {
      setImprovingDescription(false);
    }
  };


  const createManualQuote = async () => {
    if (manualSaving) return;
    if (!customerName.trim() || !description.trim()) {
      setError("Please enter at least a customer name and job description.");
      return;
    }

    const subtotal = 0;
    const taxRate = 20;
    const taxAmount = 0;
    const total = subtotal + taxAmount;

    const quote: Quote = {
      id: generateId(),
      jobType,
      jobTypeLabel: selectedType?.label ?? jobType,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim(),
      customerId: customerId || undefined,
      description: description.trim(),
      measurements: measurements.trim(),
      notes: notes.trim() || "Manual quote created without AI. Add pricing details before sending.",
      photos: photos.map((p) => p.uri),
      status: "draft",
      createdAt: new Date().toISOString(),
      lineItems: [
        {
          id: generateId(),
          description: description.trim() || "Manual quote item",
          quantity: 1,
          unit: "item",
          rate: 0,
          total: 0,
        },
      ],
      subtotal,
      taxRate,
      taxAmount,
      total,
      professionalSummary: `Manual quote for ${selectedType?.label ?? jobType}. Review and edit pricing before sending to the customer.`,
      customerSummary: description.trim(),
      validDays: 30,
      quoteNumber: generateQuoteNumber(),
    };

    try {
      setManualSaving(true);
      setError("");
      await addQuote(quote);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push(`/quote/edit/${quote.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create manual quote.");
      setManualSaving(false);
    }
  };

  const saveQuote = async () => {
    if (quoteSaving) return;
    if (!generatedQuote) return;
    try {
      setQuoteSaving(true);
      setError("");
      await addQuote(generatedQuote);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message ?? "Failed to save quote.");
      setQuoteSaving(false);
    }
  };

  const updateStatus = async (status: Quote["status"]) => {
    if (quoteSaving) return;
    if (!generatedQuote) return;
    const updated = { ...generatedQuote, status };
    setGeneratedQuote(updated);
    try {
      setQuoteSaving(true);
      setError("");
      await addQuote(updated);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message ?? "Failed to save quote.");
      setQuoteSaving(false);
    }
  };

  const bottomPad = isWeb ? 100 : insets.bottom + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

      {step === "type" && (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>What type of job?</Text>
          <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>{currentTrade.emoji} {currentTrade.label} — select the work that best fits this quote</Text>
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


          <View style={[styles.aiBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.aiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTitle, { color: colors.text }]}>AI Assistance</Text>
                <Text style={[styles.aiHint, { color: colors.mutedForeground }]}>Improves wording only. It will not price jobs or change totals.</Text>
              </View>
              <TouchableOpacity
                style={[styles.aiToggle, { backgroundColor: settings.aiAssistanceEnabled ? colors.primary : colors.muted }]}
                onPress={() => {
                  if (!isPro && !settings.aiAssistanceEnabled) {
                    setUpgradeFeature("AI Assistance");
                    return;
                  }
                  void updateSettings({ aiAssistanceEnabled: !settings.aiAssistanceEnabled });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.aiToggleText}>{settings.aiAssistanceEnabled ? "On" : "Off"}</Text>
              </TouchableOpacity>
            </View>
          </View>

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
            {settings.aiAssistanceEnabled && (
              <TouchableOpacity
                style={[styles.secondaryAiBtn, { backgroundColor: colors.secondary, opacity: improvingDescription ? 0.65 : 1 }]}
                onPress={improveDescription}
                disabled={improvingDescription}
                activeOpacity={0.85}
              >
                <Feather name="edit-3" size={15} color={colors.primary} />
                <Text style={[styles.secondaryAiBtnText, { color: colors.primary }]}>
                  {improvingDescription ? "Improving..." : "Improve wording"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Measurements / Quantities</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder={currentTrade.measurementsPlaceholder}
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
              Photos ({photos.length}/3){photos.length > 0 ? " — AI will analyse these" : ""}
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
              {photos.length < 3 && (
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

          {settings.aiAssistanceEnabled && (
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={generateQuote} activeOpacity={0.85}>
              <Feather name="cpu" size={18} color="#fff" />
              <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Generate Quote with AI</Text>
            </TouchableOpacity>
          )}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={createManualQuote}
                activeOpacity={0.85}
               disabled={manualSaving}>
                <Feather name="edit-3" size={18} color="#fff" />
                <Text style={[styles.primaryBtnText, { color: "#fff" }]}>{manualSaving ? "Creating..." : "Create Manual Quote"}</Text>
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
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
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
      <UpgradePrompt
        visible={!!upgradeFeature}
        featureName={upgradeFeature || "This feature"}
        onClose={() => setUpgradeFeature("")}
      />
      <BottomNav />
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
  aiBox: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  aiHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  aiToggle: { minWidth: 54, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  aiToggleText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  secondaryAiBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  secondaryAiBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

});
