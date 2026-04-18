import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Club } from '../types';

interface AppState {
  user: User | null;
  activeClub: Club | null;
  setUser: (user: User | null) => void;
  setActiveClub: (club: Club | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      activeClub: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setActiveClub: (club) => set({ activeClub: club }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'mealmates-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user, 
        activeClub: state.activeClub 
      }),
    }
  )
);
