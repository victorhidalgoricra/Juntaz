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
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string }) => void;
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
      setData: (partial) => set((state) => ({ ...state, ...partial })),
      addNotification: (notification) => set((state) => ({
        ...state,
        notifications: [
          {
            id: notification.id ?? crypto.randomUUID(),
            created_at: notification.created_at ?? new Date().toISOString(),
            ...notification
          },
          ...state.notifications
        ]
      }))
    }),
    { name: 'jd-app' }
  )
);
