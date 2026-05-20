import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CustomersProvider } from "@/context/CustomersContext";
import { ExpensesProvider } from "@/context/ExpensesContext";
import { InvoicesProvider } from "@/context/InvoicesContext";
import { JobsProvider } from "@/context/JobsContext";
import { QuotesProvider } from "@/context/QuotesContext";
import { SettingsProvider } from "@/context/SettingsContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const MODAL: any = { presentation: "modal", headerShown: false };
const PUSH: any = { headerShown: false };

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={PUSH} />
      <Stack.Screen name="(tabs)" options={PUSH} />
      <Stack.Screen name="new-quote" options={MODAL} />
      <Stack.Screen name="new-customer" options={MODAL} />
      <Stack.Screen name="new-invoice" options={MODAL} />
      <Stack.Screen name="new-expense" options={MODAL} />
      <Stack.Screen name="new-job" options={MODAL} />
      <Stack.Screen name="upgrade" options={MODAL} />
      <Stack.Screen name="account" options={PUSH} />
      <Stack.Screen name="settings" options={PUSH} />
      <Stack.Screen name="quote/[id]" options={PUSH} />
      <Stack.Screen name="quote/edit/[id]" options={MODAL} />
      <Stack.Screen name="customer/[id]" options={PUSH} />
      <Stack.Screen name="invoice/[id]" options={PUSH} />
      <Stack.Screen name="job/[id]" options={PUSH} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!publishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Restart the dev server after Clerk is configured.",
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <SettingsProvider>
                    <QuotesProvider>
                      <CustomersProvider>
                        <InvoicesProvider>
                          <ExpensesProvider>
                            <JobsProvider>
                              <RootLayoutNav />
                            </JobsProvider>
                          </ExpensesProvider>
                        </InvoicesProvider>
                      </CustomersProvider>
                    </QuotesProvider>
                  </SettingsProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
