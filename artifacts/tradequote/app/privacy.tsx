import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>QuoteForge Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: July 2026</Text>

      <Section title="1. Who we are">
        QuoteForge provides quoting and business administration software for tradespeople and small trade businesses.
      </Section>

      <Section title="2. Information we collect">
        We may collect account details, email address, subscription status, customer records, quote details, invoices, job information, expense entries, business settings and technical information needed to run the service.
      </Section>

      <Section title="3. How we use information">
        We use information to provide the app, save your records, process subscriptions, support your account, improve reliability, prevent misuse and communicate service-related updates.
      </Section>

      <Section title="4. Payment data">
        Payments are handled by Stripe. QuoteForge does not store full card details. Stripe may process payment, billing and fraud-prevention information according to its own terms and privacy policy.
      </Section>

      <Section title="5. AI wording support">
        If you use AI wording support, the relevant text may be sent to an AI provider to generate improved wording. You should avoid entering unnecessary sensitive personal data into AI wording fields.
      </Section>

      <Section title="6. Sharing information">
        We may share information with service providers needed to operate QuoteForge, including hosting, authentication, payment and AI service providers. We do not sell customer data to advertisers.
      </Section>

      <Section title="7. Retention">
        We keep account and business records while your account is active and for a reasonable period afterwards where needed for legal, tax, security or operational reasons.
      </Section>

      <Section title="8. Your rights">
        Depending on your location and circumstances, you may have rights to access, correct, delete, restrict or object to use of your personal data. You may also have the right to complain to the UK Information Commissioner's Office.
      </Section>

      <Section title="9. Contact">
        For privacy questions or data requests, contact QuoteForge using the support contact details shown in the app or on the website.
      </Section>

      <Text style={styles.note}>
        This privacy policy is a practical launch version and should be reviewed against your actual suppliers, data flows and business details before wider public launch.
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
  note: { marginTop: 16, fontSize: 14, lineHeight: 22, color: "#666", fontStyle: "italic" },
});
