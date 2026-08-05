import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();

let configured = false;
let identifiedUserId: string | null = null;
let currentOperation: Promise<void> | null = null;

type PlanChangeListener = () => void;
const planChangeListeners = new Set<PlanChangeListener>();

export function subscribeToPlanChanges(listener: PlanChangeListener): () => void {
  planChangeListeners.add(listener);
  return () => {
    planChangeListeners.delete(listener);
  };
}

export function notifyPlanChanged(): void {
  for (const listener of planChangeListeners) {
    listener();
  }
}

export function revenueCatAvailable(): boolean {
  return Platform.OS === "ios" && Boolean(iosApiKey);
}

export async function ensureRevenueCatUser(userId: string): Promise<void> {
  if (Platform.OS !== "ios") return;
  if (!iosApiKey) {
    throw new Error("QuoteForge purchases are not configured.");
  }

  if (currentOperation) await currentOperation;

  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({
      apiKey: iosApiKey,
      appUserID: userId,
    });
    configured = true;
    identifiedUserId = userId;
    return;
  }

  if (identifiedUserId === userId) return;

  currentOperation = Purchases.logIn(userId).then(() => {
    identifiedUserId = userId;
  }).finally(() => {
    currentOperation = null;
  });

  await currentOperation;
}

export async function resetRevenueCatUser(): Promise<void> {
  if (Platform.OS !== "ios" || !configured || !identifiedUserId) return;

  try {
    await Purchases.logOut();
  } finally {
    identifiedUserId = null;
  }
}
