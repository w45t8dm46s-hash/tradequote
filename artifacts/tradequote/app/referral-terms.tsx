import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ReferralTermsScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>QuoteForge Referral Partner Terms</Text>
      <Text style={styles.updated}>Last updated: July 2026</Text>

      <Section title="1. Referral partner offer">
        Approved referral partners may earn 10% commission for up to 12 months on paying customers they refer to QuoteForge using an agreed partner code or referral method.
      </Section>

      <Section title="2. When commission is earned">
        Commission is only earned after the referred customer's subscription payment has cleared and has not been refunded, charged back, cancelled or disputed.
      </Section>

      <Section title="3. No commission on free users">
        No commission is paid for free accounts, trial users, unpaid invoices, refunded payments, cancelled subscriptions, chargebacks or test payments.
      </Section>

      <Section title="4. Payment timing">
        Commission may be calculated monthly and paid after a reasonable delay to allow for refunds, failed payments or chargebacks.
      </Section>

      <Section title="5. Disclosure">
        Referral partners must clearly disclose that they may receive commission when promoting QuoteForge. Promotions must not be misleading or imply that QuoteForge is free, officially endorsed by a trade body, or suitable for every business.
      </Section>

      <Section title="6. Customer discount codes">
        QuoteForge may provide promotion codes giving customers a temporary discount. Customer discounts and partner commission may be changed, paused or withdrawn for future referrals.
      </Section>

      <Section title="7. Ending referral arrangements">
        QuoteForge may end or pause a referral arrangement if a partner acts unfairly, misleads customers, abuses promotion codes or damages the QuoteForge brand.
      </Section>

      <Text style={styles.note}>
        Referral arrangements should be confirmed in writing with each partner before they start promoting QuoteForge.
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
