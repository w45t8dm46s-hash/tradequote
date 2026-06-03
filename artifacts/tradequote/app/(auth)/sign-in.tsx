import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";

type Step = "credentials" | "second_factor";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("credentials");
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<string>("totp");
  const [generalError, setGeneralError] = useState("");

  const finalizeSignIn = async () => {
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
  };

  const onSubmitCredentials = async () => {
    setGeneralError("");
    try {
      await signIn.create({ identifier: email, password });
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Invalid email or password.";
      setGeneralError(msg);
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    } else if (signIn.status === "needs_second_factor") {
      const supported = (signIn as any).supportedSecondFactors as Array<{ strategy: string }> | undefined;
      const strategy = supported?.[0]?.strategy ?? "totp";
      setSecondFactorStrategy(strategy);

      if (strategy === "phone_code" || strategy === "email_code") {
        try {
          await (signIn as any).prepareSecondFactor({ strategy });
        } catch {
        }
      }

      setStep("second_factor");
    } else {
      setGeneralError(`Sign-in incomplete (status: ${signIn.status ?? "unknown"}). Try again.`);
    }
  };

  const onSubmitCode = async () => {
    setGeneralError("");
    try {
      await (signIn as any).attemptSecondFactor({ strategy: secondFactorStrategy, code });
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Invalid verification code.";
      setGeneralError(msg);
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    } else {
      setGeneralError(`Verification failed (status: ${signIn.status ?? "unknown"}). Try again.`);
    }
  };

  const isLoading = fetchStatus === "fetching";

  const secondFactorLabel =
    secondFactorStrategy === "totp"
      ? "Enter the 6-digit code from your authenticator app"
      : secondFactorStrategy === "phone_code"
      ? "Enter the code sent to your phone"
      : "Enter the verification code sent to your email";

  if (step === "second_factor") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>QuoteFlow</Text>
          <Text style={styles.title}>Two-step verification</Text>
          <Text style={styles.subtitle}>{secondFactorLabel}</Text>

          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            maxLength={8}
            autoFocus
          />

          {generalError ? <Text style={styles.error}>{generalError}</Text> : null}

          <Pressable
            style={[styles.button, (!code || isLoading) && styles.buttonDisabled]}
            onPress={onSubmitCode}
            disabled={!code || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
          </Pressable>

          <Pressable onPress={() => { setStep("credentials"); setCode(""); setGeneralError(""); }} style={styles.linkRow}>
            <Text style={styles.link}>← Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>QuoteFlow</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your QuoteFlow account</Text>

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
        {errors.fields.identifier && <Text style={styles.error}>{errors.fields.identifier.message}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
        />
        {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}

        {generalError ? <Text style={styles.error}>{generalError}</Text> : null}

        <Pressable
          style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
          onPress={onSubmitCredentials}
          disabled={!email || !password || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>

        <View style={[styles.linkRow, { marginTop: 16 }]}>
          <Link href="/(auth)/forgot-password"><Text style={styles.link}>Forgot password?</Text></Link>
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>New to QuoteFlow? </Text>
          <Link href="/(auth)/sign-up"><Text style={styles.link}>Create account</Text></Link>
        </View>
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
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  linkLabel: { color: "#666" },
  link: { color: "#FF6B35", fontWeight: "600" },
});
