'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Junta, JuntaMember, Notification, Payment, PaymentSchedule, Payout } from '@/types/domain';

type State = {
  juntas: Junta[];
  members: JuntaMember[];
  schedules: PaymentSchedule[];
  payments: Payment[];
  payouts: Payout[];
  notifications: Notification[];
  setData: (partial: Partial<State>) => void;
};

export const useAppStore = create<State>()(
  persist(
    (set) => ({
      juntas: [],
      members: [],
      schedules: [],
      payments: [],
      payouts: [],
      notifications: [],
      setData: (partial) => set((state) => ({ ...state, ...partial }))
    }),
    { name: 'jd-app' }
  )
);
