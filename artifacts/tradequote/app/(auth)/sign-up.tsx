import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSignUp } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [generalError, setGeneralError] = useState("");

  const onCreate = async () => {
    setGeneralError("");
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) {
      setGeneralError(error.message || "Could not create account");
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const onVerify = async () => {
    setGeneralError("");
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
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
      setGeneralError("Verification incomplete. Try again.");
    }
  };

  const isLoading = fetchStatus === "fetching";
  const needsVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (signUp.status === "complete") return null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>QuoteFlow</Text>

        {needsVerification ? (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>We sent a verification code to {email}.</Text>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              placeholder="123456"
              placeholderTextColor="#999"
            />
            {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
            {generalError ? <Text style={styles.error}>{generalError}</Text> : null}
            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={onVerify} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & continue</Text>}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => signUp.verifications.sendEmailCode()}>
              <Text style={styles.secondaryText}>Resend code</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Get 5 free quotes — no card required.</Text>

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
            {errors.fields.emailAddress && <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
            />
            {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

            {generalError ? <Text style={styles.error}>{generalError}</Text> : null}

            <Pressable
              style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
              onPress={onCreate}
              disabled={!email || !password || isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create account</Text>}
            </Pressable>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Already have an account? </Text>
              <Link href="/(auth)/sign-in"><Text style={styles.link}>Sign in</Text></Link>
            </View>
            <View nativeID="clerk-captcha" />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 80, gap: 8 },
  brand: { fontSize: 28, fontWeight: "700", color: "#FF6B35", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: "#fff", marginTop: 6 },
  error: { color: "#D32F2F", fontSize: 13, marginTop: 6 },
  button: { backgroundColor: "#FF6B35", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { padding: 14, alignItems: "center", marginTop: 12 },
  secondaryText: { color: "#FF6B35", fontWeight: "600" },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  linkLabel: { color: "#666" },
  link: { color: "#FF6B35", fontWeight: "600" },
});
