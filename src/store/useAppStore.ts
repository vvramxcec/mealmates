import { create } from 'zustand';
import { User, Club } from '../types';

interface AppState {
  user: User | null;
  activeClub: Club | null;
  setUser: (user: User | null) => void;
  setActiveClub: (club: Club | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeClub: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setActiveClub: (club) => set({ activeClub: club }),
  setLoading: (isLoading) => set({ isLoading }),
}));
