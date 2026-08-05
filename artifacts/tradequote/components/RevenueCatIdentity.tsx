import { useAuth } from "@clerk/expo";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import {
  ensureRevenueCatUser,
  resetRevenueCatUser,
} from "@/lib/revenueCatClient";

export function RevenueCatIdentity({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "ios" || !isLoaded) return;

    if (isSignedIn && userId) {
      void ensureRevenueCatUser(userId).catch((error) => {
        console.error("RevenueCat sign-in failed:", error);
      });
      return;
    }

    void resetRevenueCatUser().catch((error) => {
      console.error("RevenueCat sign-out failed:", error);
    });
  }, [isLoaded, isSignedIn, userId]);

  return <>{children}</>;
}
