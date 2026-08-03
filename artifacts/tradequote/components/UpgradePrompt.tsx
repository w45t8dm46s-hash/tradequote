import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

type UpgradePromptProps = {
  visible: boolean;
  featureName: string;
  description?: string;
  onClose: () => void;
};

export default function UpgradePrompt({
  visible,
  featureName,
  description,
  onClose,
}: UpgradePromptProps) {
  const isIOS = Platform.OS === "ios";

  const goUpgrade = () => {
    onClose();
    router.push("/upgrade");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconBubble}>
            <Feather name="zap" size={24} color="#FF6B35" />
          </View>

          <Text style={styles.title}>{isIOS ? "Feature unavailable" : "Upgrade required"}</Text>
          <Text style={styles.body}>
            {featureName} is not included in your current plan.
          </Text>
          <Text style={styles.subBody}>
            {isIOS
              ? "This feature is unavailable for this account."
              : description || "Upgrade to unlock AI wording, professional PDF documents and advanced quote tools."}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryText}>{isIOS ? "Close" : "Not now"}</Text>
            </Pressable>

            {!isIOS && (
              <Pressable style={styles.primaryBtn} onPress={goUpgrade}>
                <Text style={styles.primaryText}>Upgrade</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF1E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#111827",
    textAlign: "center",
    fontWeight: "600",
  },
  subBody: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    width: "100%",
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
