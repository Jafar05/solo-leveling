import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsStore {
  deepseekApiKey: string;
  setApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      deepseekApiKey: '',
      setApiKey: (key) => set({ deepseekApiKey: key }),
    }),
    {
      name: 'solo-leveling-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
