import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TradePicker from "@/components/TradePicker";
import { useColors } from "@/hooks/useColors";

const TABS = [
  { key: "index",     label: "Home",      feather: "home",        ios: "house" },
  { key: "trade",     label: "Trade",     feather: "tool",        ios: "wrench.and.screwdriver" },
  { key: "customers", label: "Customers", feather: "users",       ios: "person.2" },
  { key: "quotes",    label: "Quotes",    feather: "file-text",   ios: "doc.text" },
  { key: "finance",   label: "Finance",   feather: "credit-card", ios: "creditcard" },
  { key: "schedule",  label: "Schedule",  feather: "calendar",    ios: "calendar" },
] as const;

const ROUTES: Record<string, string> = {
  index:     "/(tabs)/",
  customers: "/(tabs)/customers",
  quotes:    "/(tabs)/quotes",
  finance:   "/(tabs)/finance",
  schedule:  "/(tabs)/schedule",
};

export default function BottomNav() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const [showTrade, setShowTrade] = useState(false);

  const handlePress = (key: string) => {
    if (key === "trade") {
      setShowTrade(true);
      return;
    }
    const route = ROUTES[key];
    if (route) router.replace(route as any);
  };

  return (
    <>
      <TradePicker visible={showTrade} onDismiss={() => setShowTrade(false)} />
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: isWeb ? 10 : insets.bottom > 0 ? insets.bottom : 8,
          },
        ]}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
          >
            {isIOS ? (
              <SymbolView name={tab.ios as any} size={22} tintColor={colors.mutedForeground} />
            ) : (
              <Feather name={tab.feather as any} size={22} color={colors.mutedForeground} />
            )}
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});
