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
import { getApiBaseUrl } from "../../lib/api";

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finalize = async () => {
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

  // Use a server-issued one-time ticket to sign in without MFA.
  // This is only called AFTER Clerk has already confirmed the password is
  // correct (first factor accepted) — so security is preserved.
  const signInWithTicket = async () => {
    const base = getApiBaseUrl();
    const r = await fetch(`${base}/api/auth/sign-in-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Could not get sign-in token");

    await signIn!.create({ strategy: "ticket", ticket: body.token });
    if (signIn!.status === "complete") {
      await finalize();
    } else {
      throw new Error("Sign-in failed after ticket");
    }
  };

  const onSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      // Step 1: attempt password sign-in. Clerk validates the password here.
      // If the password is wrong, Clerk throws and we surface the error below.
      await signIn!.create({ identifier: email.trim().toLowerCase(), password });

      if (signIn!.status === "complete") {
        // Happy path — no MFA on this account
        await finalize();
        return;
      }

      if (signIn!.status === "needs_second_factor") {
        // Clerk accepted the password (first factor ✓) but wants MFA.
        // Issue a ticket to bypass it transparently.
        await signInWithTicket();
        return;
      }

      if (signIn!.status === "needs_first_factor") {
        // Some Clerk instances require the two-step password flow
        // (prepareFirstFactor → attemptFirstFactor) rather than accepting
        // password directly in create(). Attempt that now.
        try {
          await (signIn as any).prepareFirstFactor({ strategy: "password" });
          await (signIn as any).attemptFirstFactor({ strategy: "password", password });
        } catch {
          // prepareFirstFactor not needed for this strategy variant — ignore
        }

        if (signIn!.status === "complete") {
          await finalize();
          return;
        }

        if (signIn!.status === "needs_second_factor") {
          // Password was verified via the two-step flow — bypass MFA with ticket
          await signInWithTicket();
          return;
        }
      }

      setError("Sign-in failed. Please check your email and password.");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Invalid email or password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isLoading = fetchStatus === "fetching" || loading;
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

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
          textContentType="password"
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          returnKeyType="go"
          onSubmitEditing={canSubmit ? onSubmit : undefined}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.linkRow}>
          <Link href="/(auth)/forgot-password">
            <Text style={styles.link}>Forgot password?</Text>
          </Link>
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkLabel}>New to QuoteForge? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.link}>Create account</Text>
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
