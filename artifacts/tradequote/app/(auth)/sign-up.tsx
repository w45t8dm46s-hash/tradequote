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
import { useSignUp } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";

type Stage = "form" | "verify";

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finalize = async () => {
    await signUp!.finalize({
      navigate: ({ decorateUrl }: { decorateUrl: (path: string) => string }) => {
        const url = decorateUrl("/(tabs)");
        if (typeof window !== "undefined" && url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.replace(url as Href);
        }
      },
    });
  };

  // Stage 1 — create the Clerk account
  const onCreate = async () => {
    if (!signUp) return;
    setError("");
    setBusy(true);
    try {
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
      });

      if (signUp.status === "complete") {
        await finalize();
        return;
      }

      // Email verification required — send the code
      if (
        signUp.unverifiedFields?.includes("email_address") ||
        signUp.status === "missing_requirements"
      ) {
        await (signUp as any).prepareEmailAddressVerification({ strategy: "email_code" });
        setStage("verify");
        return;
      }

      setError("Account creation failed. Please try again.");
    } catch (e: any) {
      setError(
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        "Could not create account. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // Stage 2 — verify the emailed code and activate the session
  const onVerify = async () => {
    if (!signUp) return;
    setError("");
    setBusy(true);
    try {
      const result = await (signUp as any).attemptEmailAddressVerification({ code: code.trim() });

      if (result.status === "complete") {
        await finalize();
        return;
      }

      setError("Verification failed. Please check the code and try again.");
    } catch (e: any) {
      setError(
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        "Invalid or expired code. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const isLoading = fetchStatus === "fetching" || busy;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !isLoading;
  const canVerify = code.trim().length === 6 && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>QuoteForge</Text>

        {stage === "form" ? (
          <>
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
          </>
        ) : (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              placeholder="123456"
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={canVerify ? onVerify : undefined}
              autoFocus
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, !canVerify && styles.buttonDisabled]}
              onPress={onVerify}
              disabled={!canVerify}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify email</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setStage("form");
                setCode("");
                setError("");
              }}
            >
              <Text style={[styles.link, styles.centred]}>Use a different email</Text>
            </Pressable>
          </>
        )}

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
  subtitle: { fontSize: 16, color: "#666", marginBottom: 32, lineHeight: 22 },
  emailHighlight: { fontWeight: "600", color: "#333" },
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
  centred: { textAlign: "center", marginTop: 16 },
});
