import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

interface TranslationContextType {
  translations: Record<string, string>;
  language: string;
  t: (key: string, defaultValue?: string) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  // Get user from store using Zustand hook - use shallow equality to prevent unnecessary re-renders
  const user = useAuthStore((state) => state.user);
  // Use useMemo to stabilize language value
  const language = useMemo(() => user?.language_preference || 'en', [user?.language_preference]);

  const { data: translations = {}, isLoading } = useQuery({
    queryKey: ['translations', language],
    queryFn: async () => {
      try {
        const response = await api.get(`/translations?language=${language}`);
        return response.data || {};
      } catch (error: any) {
        // Silently fail - return empty object, app will work without translations
        // Don't log errors for translations as they're not critical
        return {};
      }
    },
    enabled: true, // Always enabled, will use 'en' as default
    staleTime: 0, // Always refetch when language changes (language is in queryKey)
    cacheTime: 0, // Don't cache - always fetch fresh
    retry: 0, // Don't retry on error
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch when language changes (language is in queryKey)
    refetchOnReconnect: false,
    // Don't throw errors - just return empty object
    throwOnError: false,
  });

  const t = (key: string, defaultValue?: string): string => {
    if (!translations || typeof translations !== 'object') {
      return defaultValue || key;
    }
    return translations[key] || defaultValue || key;
  };

  return (
    <TranslationContext.Provider value={{ translations: translations || {}, language, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    // Return a default translation function if context is not available
    return {
      translations: {},
      language: 'en',
      t: (key: string, defaultValue?: string) => defaultValue || key,
      isLoading: false,
    };
  }
  return context;
}

