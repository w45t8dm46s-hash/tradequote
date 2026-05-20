import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface BusinessSettings {
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
}

const DEFAULTS: BusinessSettings = {
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
  footerNote: "All work is carried out in compliance with BS 7671 (18th Edition) and Part P of the Building Regulations. A certificate of compliance will be issued on completion.",
};

interface SettingsContextValue {
  settings: BusinessSettings;
  updateSettings: (updates: Partial<BusinessSettings>) => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const STORAGE_KEY = "@tradequote_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings({ ...DEFAULTS, ...parsed });
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (updates: Partial<BusinessSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) => {
        console.error("Failed to persist settings", e);
      });
      return next;
    });
  }, []);

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
