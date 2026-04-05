'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export function useBootstrap() {
  const user = useAuthStore((s) => s.user);
  const setData = useAppStore((s) => s.setData);

  useEffect(() => {
    if (!user) {
      setData({ juntas: [], members: [], notifications: [] });
    }
  }, [setData, user]);
}
