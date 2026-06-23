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

type Stage = "email" | "code" | "password";

function clerkMsg(error: { longMessage?: string | null; message?: string | null } | null | undefined, fallback: string): string {
  if (!error) return fallback;
  return error.longMessage || error.message || fallback;
}

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

  // Stage 1 — identify the user and send the reset code
  // Uses SignInFutureResource.create({ identifier }) then resetPasswordEmailCode.sendCode()
  const sendCode = async () => {
    if (!signIn) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const { error: createErr } = await signIn.create({ identifier: email.trim().toLowerCase() });

      if (createErr) {
        const errCode = (createErr as any).code ?? "";
        // Don't reveal whether the email is registered
        if (errCode === "form_identifier_not_found" || errCode.includes("not_found")) {
          setInfo("If an account exists for this email, a reset code will be sent.");
          setStage("code");
          return;
        }
        setError(clerkMsg(createErr, "Could not send reset code. Check the email address and try again."));
        return;
      }

      // Send the reset code using the typed resetPasswordEmailCode namespace
      const { error: sendErr } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendErr) {
        setError(clerkMsg(sendErr, "Could not send reset code. Please try again."));
        return;
      }

      setInfo(`A 6-digit reset code has been sent to ${email.trim()}.`);
      setStage("code");
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Stage 2 — verify the emailed code (status becomes needs_new_password)
  // Uses SignInFutureResource.resetPasswordEmailCode.verifyCode()
  const verifyCode = async () => {
    if (!signIn) return;
    setError("");
    setBusy(true);
    try {
      const { error: verifyErr } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });

      if (verifyErr) {
        setError(clerkMsg(verifyErr, "Invalid or expired code. Please try again."));
        return;
      }

      setStage("password");
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Stage 3 — set the new password (status becomes complete) then finalize
  // Uses SignInFutureResource.resetPasswordEmailCode.submitPassword()
  const submitPassword = async () => {
    if (!signIn) return;
    setError("");
    setBusy(true);
    try {
      const { error: submitErr } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });

      if (submitErr) {
        setError(clerkMsg(submitErr, "Could not set new password. Please try again."));
        return;
      }

      const { error: finalErr } = await signIn.finalize();
      if (finalErr) {
        setError(clerkMsg(finalErr, "Password reset. Please sign in manually."));
        return;
      }
      router.replace("/(tabs)" as Href);
    } catch (e: any) {
      setError(e?.message || "An unexpected error occurred. Please try again.");
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

        {/* Stage 1: email */}
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

        {/* Stage 2: code */}
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
              autoFocus
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

        {/* Stage 3: new password */}
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
              autoFocus
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
