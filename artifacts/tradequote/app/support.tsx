import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const SUPPORT_EMAIL = "quoteforgetest@outlook.com";

export default function SupportScreen() {
  const emailSupport = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=QuoteForge support request`);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>QuoteForge Support</Text>
      <Text style={styles.updated}>Help with your QuoteForge account and app</Text>

      <Section title="Contact support">
        For help with signing in, quotes, invoices, account information or a technical problem, email our support team.
      </Section>

      <Pressable
        style={styles.emailButton}
        onPress={emailSupport}
        accessibilityRole="link"
        accessibilityLabel={`Email QuoteForge support at ${SUPPORT_EMAIL}`}
      >
        <Text style={styles.emailButtonText}>{SUPPORT_EMAIL}</Text>
      </Pressable>

      <Section title="What to include">
        Please include the email address connected to your QuoteForge account, the device you are using and a short description of the problem. Screenshots can also help us investigate.
      </Section>

      <Section title="Protect your information">
        Never send your password, complete payment-card details or other sensitive financial information in a support email.
      </Section>

      <Text style={styles.footer}>
        QuoteForge aims to respond to support requests as soon as reasonably possible.
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, maxWidth: 820, width: "100%", alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "800", color: "#111", marginBottom: 8 },
  updated: { fontSize: 14, color: "#666", marginBottom: 24 },
  section: { marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, color: "#333" },
  emailButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  emailButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footer: { marginTop: 8, fontSize: 14, lineHeight: 22, color: "#666" },
});
