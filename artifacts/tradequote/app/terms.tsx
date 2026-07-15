import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function TermsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>QuoteForge Terms</Text>
      <Text style={styles.body}>
        QuoteForge is provided to help trades create and manage quotes, invoices, jobs and related records.
        Users remain responsible for checking all quote wording, pricing, tax, legal, safety and compliance details before sending documents to customers.
      </Text>
      <Text style={styles.body}>
        AI wording support, where available, is a drafting aid only. It does not price work, certify compliance, guarantee accuracy or replace trade judgement.
      </Text>
      <Text style={styles.body}>
        Subscriptions are handled securely by Stripe. Users can cancel according to the cancellation process shown in their account page.
      </Text>
      <Text style={styles.body}>
        Replace this placeholder with solicitor-reviewed terms before broad public launch.
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
