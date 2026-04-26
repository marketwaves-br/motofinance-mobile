import { create } from 'zustand';
import { AppSettingsRepository, type ThemePreference } from '@/infrastructure/repositories/AppSettingsRepository';
import { UserProfileRepository } from '@/infrastructure/repositories/UserProfileRepository';

interface AppState {
  // Onboarding
  hasCompletedOnboarding: boolean;
  isOnboardingLoaded: boolean;
  loadOnboardingState: () => Promise<void>;
  completeOnboarding: () => Promise<void>;

  // Perfil do motorista
  userName: string | null;
  loadUserProfile: () => Promise<void>;

  // Tema
  themePreference: ThemePreference;
  loadThemePreference: () => Promise<void>;
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  // Loading geral
  isLoading: boolean;
  setLoading: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Onboarding
  hasCompletedOnboarding: false,
  isOnboardingLoaded: false,

  loadOnboardingState: async () => {
    try {
      const completed = await AppSettingsRepository.isOnboardingCompleted();
      set({ hasCompletedOnboarding: completed, isOnboardingLoaded: true });
    } catch (error) {
      console.error('Erro ao carregar estado do onboarding:', error);
      set({ isOnboardingLoaded: true }); // Marca como carregado mesmo com erro para não travar
    }
  },

  completeOnboarding: async () => {
    try {
      await AppSettingsRepository.completeOnboarding();
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('Erro ao salvar onboarding:', error);
      // Atualiza Zustand mesmo se SQLite falhar, para não travar o fluxo
      set({ hasCompletedOnboarding: true });
    }
  },

  // Perfil do motorista
  userName: null,

  loadUserProfile: async () => {
    try {
      const profile = await UserProfileRepository.getProfile();
      if (profile) {
        set({ userName: profile.fullName });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  },

  // Tema
  themePreference: 'system',

  loadThemePreference: async () => {
    try {
      const pref = await AppSettingsRepository.getTheme();
      set({ themePreference: pref });
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
    }
  },

  setThemePreference: async (pref: ThemePreference) => {
    set({ themePreference: pref });
    try {
      await AppSettingsRepository.setTheme(pref);
    } catch (err) {
      console.error('Erro ao salvar tema:', err);
    }
  },

  // Loading geral
  isLoading: false,
  setLoading: (val) => set({ isLoading: val }),
}));
