import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSignUp, useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import { getApiBaseUrl } from "../../lib/api";

export default function SignUpScreen() {
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [autoVerifying, setAutoVerifying] = useState(false);

  const finalizeSignUp = async () => {
    await signUp!.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/(tabs)");
        if (typeof window !== "undefined" && url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.replace(url as Href);
        }
      },
    });
  };

  const finalizeSignIn = async () => {
    await signIn!.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl("/(tabs)");
        if (typeof window !== "undefined" && url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.replace(url as Href);
        }
      },
    });
  };

  const onCreate = async () => {
    setError("");

    try {
      await signUp!.password({
        emailAddress: email.trim().toLowerCase(),
        password,
      });
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Could not create account. Please try again.";
      setError(msg);
      return;
    }

    if (signUp!.status === "complete") {
      await finalizeSignUp();
      return;
    }

    const needsEmailVerification =
      signUp!.unverifiedFields?.includes("email_address") ||
      signUp!.status === "missing_requirements";

    if (needsEmailVerification) {
      setAutoVerifying(true);
      try {
        const base = getApiBaseUrl();
        const r = await fetch(`${base}/api/auth/auto-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        if (!r.ok) throw new Error("auto-verify failed");

        await signIn!.create({
          identifier: email.trim().toLowerCase(),
          password,
        });

        if (signIn!.status === "complete") {
          await finalizeSignIn();
          return;
        }

        setError("Account created but sign-in failed. Please sign in manually.");
      } catch (err: any) {
        setError(
          err?.errors?.[0]?.longMessage ||
          err?.message ||
          "Account created but could not sign in automatically. Please sign in on the next screen."
        );
      } finally {
        setAutoVerifying(false);
      }
      return;
    }

    setError("Account creation failed. Please try again.");
  };

  const isLoading = signUpFetch === "fetching" || autoVerifying;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>QuoteForge</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Get 5 free quotes — no card required.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          textContentType="newPassword"
          placeholder="At least 8 characters"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={canSubmit ? onCreate : undefined}
        />
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.hint}>Password must be at least 8 characters</Text>
        )}

        {autoVerifying && (
          <Text style={styles.hint}>Setting up your account…</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onCreate}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.link}>Sign in</Text>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { padding: 24, paddingTop: 80, gap: 8 },
  brand: { fontSize: 28, fontWeight: "700", color: "#FF6B35", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    marginTop: 6,
  },
  hint: { color: "#888", fontSize: 12, marginTop: 4 },
  error: { color: "#D32F2F", fontSize: 13, marginTop: 10, lineHeight: 18 },
  button: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  linkLabel: { color: "#666" },
  link: { color: "#FF6B35", fontWeight: "600" },
});
