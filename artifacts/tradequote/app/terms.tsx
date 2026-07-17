import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function TermsScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>QuoteForge Terms & Conditions</Text>
      <Text style={styles.updated}>Last updated: July 2026</Text>

      <Section title="1. What QuoteForge does">
        QuoteForge provides quoting, invoicing, customer record, scheduling, expense and wording-support tools for UK tradespeople and small trade businesses.
      </Section>

      <Section title="2. User responsibility">
        You remain responsible for checking all quotes, invoices, prices, VAT, tax treatment, job descriptions, customer details, legal wording, safety details and trade compliance before sending anything to a customer.
      </Section>

      <Section title="3. AI wording support">
        QuoteForge may include AI wording support to help rewrite or improve quote descriptions. AI output is a drafting aid only. It does not certify prices, legal compliance, trade accuracy, building regulations, safety standards or suitability for a specific job.
      </Section>

      <Section title="4. Subscriptions and payment">
        Paid subscriptions are billed through Stripe. Subscription pricing is shown before checkout. You can cancel your subscription at any time, but cancellation does not normally refund payments already taken unless required by law or agreed by QuoteForge.
      </Section>

      <Section title="5. Free use and limits">
        QuoteForge may offer a limited free allowance, such as a set number of quotes. We may change free limits, features or pricing in future, but we will not intentionally remove paid access already due for the current paid billing period.
      </Section>

      <Section title="6. Availability">
        We aim to keep QuoteForge available, but we cannot guarantee uninterrupted service. Access may be affected by maintenance, hosting issues, third-party providers, internet problems or other faults outside our control.
      </Section>

      <Section title="7. Data entered by users">
        You are responsible for ensuring that information you enter into QuoteForge is accurate, lawful and appropriate. This includes customer names, addresses, job notes, prices, expenses and invoice information.
      </Section>

      <Section title="8. Liability">
        QuoteForge is provided as an administrative tool. To the fullest extent permitted by law, we are not responsible for business losses, lost profits, lost opportunities, incorrect quotes, incorrect invoices, underpricing, overpricing, or reliance on AI-generated wording.
      </Section>

      <Section title="9. Contact">
        For support, questions or cancellation issues, contact QuoteForge using the support contact details shown in the app or on the website.
      </Section>

      <Text style={styles.note}>
        These terms are a practical launch version and should be reviewed by a qualified legal adviser before wider public launch.
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
