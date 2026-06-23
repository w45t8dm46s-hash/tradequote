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
import { useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";
import { getApiBaseUrl, parseJsonResponse } from "../../lib/api";

type Stage = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const finalize = async () => {
    await (signIn as any).finalize({
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

  const signInWithTicket = async () => {
    const base = getApiBaseUrl();
    const r = await fetch(`${base}/api/auth/sign-in-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const body = await parseJsonResponse<{ token?: string; error?: string }>(r);
    if (!r.ok) throw new Error(body.error || "Could not get sign-in token");
    await (signIn as any).create({ strategy: "ticket", ticket: body.token });
    if (signIn!.status === "complete") {
      await finalize();
    } else {
      throw new Error("Sign-in failed after ticket");
    }
  };

  // Stage 1 — request a reset code via email
  const sendCode = async () => {
    if (!signIn) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await (signIn as any).create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });
      setInfo(`A 6-digit reset code has been sent to ${email.trim()}.`);
      setStage("code");
    } catch (e: any) {
      const clerkCode: string = e?.errors?.[0]?.code ?? "";
      // Don't reveal whether the email is registered
      if (
        clerkCode === "form_identifier_not_found" ||
        clerkCode === "form_identifier_not_found_for_strategy" ||
        clerkCode.includes("not_found")
      ) {
        setInfo("If an account exists for this email, a reset code will be sent.");
        setStage("code");
      } else {
        setError(
          e?.errors?.[0]?.longMessage ||
          e?.errors?.[0]?.message ||
          e?.message ||
          "Could not send reset code. Check the email address and try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  // Stage 2 — verify the emailed code; Clerk transitions to needs_new_password
  const verifyCode = async () => {
    if (!signIn) return;
    setError("");
    setBusy(true);
    try {
      const result = await (signIn as any).attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
      });
      if (result.status === "needs_new_password") {
        setStage("password");
      } else if (result.status === "complete") {
        await finalize();
      } else {
        setError("Unexpected state after code verification. Please try again.");
      }
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

  // Stage 3 — set the new password; Clerk completes the sign-in
  const submitPassword = async () => {
    if (!signIn) return;
    setError("");
    setBusy(true);
    try {
      const result = await (signIn as any).resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (result.status === "complete") {
        await finalize();
        return;
      }
      if (result.status === "needs_second_factor") {
        await signInWithTicket();
        return;
      }
      setError("Password reset, but sign-in failed. Please sign in manually.");
    } catch (e: any) {
      setError(
        e?.errors?.[0]?.longMessage ||
        e?.errors?.[0]?.message ||
        e?.message ||
        "Could not set new password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setStage("email");
    setCode("");
    setNewPassword("");
    setError("");
    setInfo("");
  };

  const canSend = email.trim().length > 0 && !busy;
  const canVerify = code.trim().length === 6 && !busy;
  const canSubmit = newPassword.length >= 8 && !busy;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>QuoteForge</Text>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          {stage === "email" && "Enter your email and we'll send a 6-digit reset code."}
          {stage === "code" && "Enter the 6-digit code from your email."}
          {stage === "password" && "Choose a new password for your account."}
        </Text>

        {/* ── Stage 1: email ── */}
        {stage === "email" && (
          <>
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
              returnKeyType="go"
              onSubmitEditing={canSend ? sendCode : undefined}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, !canSend && styles.buttonDisabled]}
              onPress={sendCode}
              disabled={!canSend}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset code</Text>}
            </Pressable>
          </>
        )}

        {/* ── Stage 2: code ── */}
        {stage === "code" && (
          <>
            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            <Text style={styles.label}>6-digit code</Text>
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
              onSubmitEditing={canVerify ? verifyCode : undefined}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, !canVerify && styles.buttonDisabled]}
              onPress={verifyCode}
              disabled={!canVerify}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify code</Text>}
            </Pressable>
            <Pressable onPress={restart}>
              <Text style={[styles.link, styles.centred]}>Use a different email</Text>
            </Pressable>
          </>
        )}

        {/* ── Stage 3: new password ── */}
        {stage === "password" && (
          <>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              textContentType="newPassword"
              placeholder="At least 8 characters"
              placeholderTextColor="#999"
              value={newPassword}
              onChangeText={setNewPassword}
              returnKeyType="go"
              onSubmitEditing={canSubmit ? submitPassword : undefined}
            />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <Text style={styles.hint}>Password must be at least 8 characters</Text>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={submitPassword}
              disabled={!canSubmit}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Set new password</Text>}
            </Pressable>
          </>
        )}

        <View style={styles.linkRow}>
          <Link href="/(auth)/sign-in">
            <Text style={styles.link}>Back to sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { padding: 24, paddingTop: 80, gap: 8 },
  brand: { fontSize: 28, fontWeight: "700", color: "#FF6B35", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 24, lineHeight: 21 },
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
  error: { color: "#D32F2F", fontSize: 13, marginTop: 8, lineHeight: 18 },
  infoText: { color: "#15803D", fontSize: 13, marginTop: 4, marginBottom: 4, lineHeight: 18 },
  button: {
    backgroundColor: "#FF6B35",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  link: { color: "#FF6B35", fontWeight: "600" },
  centred: { textAlign: "center", marginTop: 16 },
});
