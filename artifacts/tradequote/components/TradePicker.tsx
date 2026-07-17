import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
} from "react-native";
import { TRADES } from "@/lib/trades";
import { useSettings } from "@/context/SettingsContext";

interface TradePickerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function TradePicker({ visible, onDismiss }: TradePickerProps) {
  const { settings, updateSettings } = useSettings();
  const visibleTrades = TRADES.filter((trade) => trade.label !== "Gas Engineer");
  const [selected, setSelected] = React.useState(settings.trade || "electrician");

  React.useEffect(() => {
    if (visible) setSelected(settings.trade || "electrician");
  }, [visible, settings.trade]);

  const handleContinue = async () => {
    const trade = visibleTrades.find((t) => t.id === selected) ?? TRADES.find((t) => t.id === selected);
    await updateSettings({
      trade: selected,
      labourRate: settings.labourRate || trade?.defaultLabourRate || 45,
    });
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your trade?</Text>
          <Text style={styles.subtitle}>
            QuoteForge tailors job types and AI quotes to your trade.{"\n"}You can update this anytime in Settings.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {visibleTrades.map((trade) => {
            const active = selected === trade.id;
            return (
              <Pressable
                key={trade.id}
                style={[styles.card, active && styles.cardActive]}
                onPress={() => setSelected(trade.id)}
              >
                <Text style={styles.emoji}>{trade.emoji}</Text>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                  {trade.label}
                </Text>
                {active && <View style={styles.tick} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.btn} onPress={handleContinue}>
            <Text style={styles.btnText}>Continue →</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: "700", color: "#111", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", lineHeight: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    position: "relative",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  cardActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF7F4",
  },
  emoji: { fontSize: 36 },
  cardLabel: { fontSize: 13, fontWeight: "600", color: "#374151", textAlign: "center" },
  cardLabelActive: { color: "#FF6B35" },
  tick: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6B35",
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 8 : 24,
  },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
