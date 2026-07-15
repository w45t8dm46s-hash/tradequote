import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";

export interface BusinessSettings {
  trade: string;
  businessName: string;
  tradingAs: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatNumber: string;
  companyNumber: string;
  niceicNumber: string;
  bankName: string;
  bankSortCode: string;
  bankAccount: string;
  logoDataUri: string;
  brandColor: string;
  labourRate: number;
  vatRate: number;
  vatRegistered: boolean;
  validDays: number;
  paymentTerms: string;
  footerNote: string;
  aiAssistanceEnabled: boolean;
}

const DEFAULTS: BusinessSettings = {
  trade: "",
  businessName: "",
  tradingAs: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  vatNumber: "",
  companyNumber: "",
  niceicNumber: "",
  bankName: "",
  bankSortCode: "",
  bankAccount: "",
  logoDataUri: "",
  brandColor: "#FF6B35",
  labourRate: 55,
  vatRate: 20,
  vatRegistered: false,
  validDays: 30,
  paymentTerms: "Payment due within 14 days of invoice.",
  footerNote: "",
  aiAssistanceEnabled: false,
};

interface SettingsContextValue {
  settings: BusinessSettings;
  updateSettings: (updates: Partial<BusinessSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const STORAGE_KEY = "@tradequote_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const localUserKey = isSignedIn && userId ? `${STORAGE_KEY}:${userId}` : null;

  const loadSettings = useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);

    try {
      if (!isSignedIn || !userId) {
        setSettings(DEFAULTS);
        return;
      }

      const token = await getToken();

      const response = await fetch(`${getApiBaseUrl()}/api/me/records/businessSettings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => []);

      if (response.ok && Array.isArray(data) && data.length > 0) {
        const latest = data[0]?.payload ?? data[0];
        const cloudSettings = latest?.settings ?? latest;
        const merged = { ...DEFAULTS, ...cloudSettings };

        setSettings(merged);

        if (localUserKey) {
          await AsyncStorage.setItem(localUserKey, JSON.stringify(merged)).catch(() => {});
        }

        return;
      }

      if (localUserKey) {
        const localRaw = await AsyncStorage.getItem(localUserKey);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          setSettings({ ...DEFAULTS, ...parsed });
          return;
        }
      }

      setSettings(DEFAULTS);
    } catch (e) {
      console.error("Failed to load settings", e);

      try {
        if (localUserKey) {
          const localRaw = await AsyncStorage.getItem(localUserKey);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            setSettings({ ...DEFAULTS, ...parsed });
            return;
          }
        }
      } catch {}

      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, localUserKey, userId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSettings = useCallback(async (updates: Partial<BusinessSettings>) => {
    const nextSettings = { ...settings, ...updates };

    setSettings(nextSettings);

    if (localUserKey) {
      AsyncStorage.setItem(localUserKey, JSON.stringify(nextSettings)).catch((e) => {
        console.error("Failed to persist settings locally", e);
      });
    }

    try {
      if (!isSignedIn || !userId) return;

      const token = await getToken();

      await fetch(`${getApiBaseUrl()}/api/me/records/businessSettings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: "business-settings",
          settings: nextSettings,
          updatedAt: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Failed to persist settings to cloud", e);
    }
  }, [getToken, isSignedIn, localUserKey, settings, userId]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}


export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
