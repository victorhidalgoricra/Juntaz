'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile } from '@/types/domain';

type AuthState = {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user })
    }),
    { name: 'jd-auth' }
  )
);
