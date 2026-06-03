import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";

export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "verify">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const sendCode = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStage("verify");
      setInfo("We sent a 6-digit code to your email.");
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? e?.message ?? "Could not send reset code.");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result?.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/(tabs)");
            if (typeof window !== "undefined" && url.startsWith("http")) {
              window.location.href = url;
            } else {
              router.replace(url as Href);
            }
          },
        });
      } else {
        setError("Reset could not be completed. Try again.");
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? e?.message ?? "Invalid code or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>QuoteFlow</Text>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          {stage === "email" ? "Enter your email and we'll send a reset code." : "Enter the code from your email and choose a new password."}
        </Text>

        {stage === "email" ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.button, (!email || busy) && styles.buttonDisabled]} onPress={sendCode} disabled={!email || busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset code</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {info ? <Text style={styles.info}>{info}</Text> : null}
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
              maxLength={6}
            />
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={[styles.button, (!code || !newPassword || busy) && styles.buttonDisabled]} onPress={submitReset} disabled={!code || !newPassword || busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
            </Pressable>
            <Pressable onPress={() => { setStage("email"); setCode(""); setNewPassword(""); setError(""); }}>
              <Text style={[styles.link, { textAlign: "center", marginTop: 16 }]}>Use a different email</Text>
            </Pressable>
          </>
        )}

        <View style={styles.linkRow}>
          <Link href="/(auth)/sign-in"><Text style={styles.link}>Back to sign in</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 80, gap: 8 },
  brand: { fontSize: 28, fontWeight: "700", color: "#FF6B35", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 24, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "#fff", marginTop: 6 },
  error: { color: "#D32F2F", fontSize: 13, marginTop: 8 },
  info: { color: "#15803D", fontSize: 13, marginTop: 4, marginBottom: 4 },
  button: { backgroundColor: "#FF6B35", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: "#FF6B35", fontWeight: "600" },
});
