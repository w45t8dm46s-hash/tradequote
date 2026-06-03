import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter, type Href } from "expo-router";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalError, setGeneralError] = useState("");

  const onSubmit = async () => {
    setGeneralError("");
    const { error } = await signIn.create({ identifier: email, password });
    if (error) {
      setGeneralError(error.message || "Invalid email or password.");
      return;
    }
    if (signIn.status === "complete") {
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
    } else if (signIn.status === "needs_first_factor" || signIn.status === "needs_second_factor") {
      setGeneralError("Additional verification required. Please contact support.");
    } else {
      setGeneralError("Sign-in could not be completed. Please check your email and password.");
    }
  };

  const isLoading = fetchStatus === "fetching";

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
          onPress={onSubmit}
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
