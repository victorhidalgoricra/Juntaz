'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NotificationsPanel } from '@/components/account/notifications-panel';
import { ProfilePanel } from '@/components/account/profile-panel';
import { SettingsPanel } from '@/components/account/settings-panel';

type AccountTab = 'profile' | 'notifications' | 'settings';

const tabs: Array<{ id: AccountTab; label: string }> = [
  { id: 'profile', label: 'Perfil' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'settings', label: 'Configuración' }
];

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = useMemo<AccountTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notifications' || tabParam === 'settings' || tabParam === 'profile') return tabParam;
    return 'profile';
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="text-sm text-slate-600">Administra tu perfil, notificaciones y configuración desde un solo lugar.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.replace(`/account?tab=${tab.id}`)}
            className={`rounded-md px-3 py-2 text-sm transition ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfilePanel />}
      {activeTab === 'notifications' && <NotificationsPanel />}
      {activeTab === 'settings' && <SettingsPanel />}
    </div>
  );
}
