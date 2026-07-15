import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>QuoteForge Privacy</Text>
      <Text style={styles.body}>
        QuoteForge stores account, customer, quote, invoice, job and expense information so the app can provide its core service.
      </Text>
      <Text style={styles.body}>
        Payment processing is handled by Stripe. Authentication is handled by Clerk. AI wording requests, when enabled and used, may send the text being improved to the AI provider for processing.
      </Text>
      <Text style={styles.body}>
        Do not enter unnecessary sensitive personal information into quote descriptions or AI prompts.
      </Text>
      <Text style={styles.body}>
        Replace this placeholder with a solicitor-reviewed privacy policy before broad public launch.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { padding: 24, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", color: "#111" },
  body: { fontSize: 14, lineHeight: 22, color: "#374151" },
});
