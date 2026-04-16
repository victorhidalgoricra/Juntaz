'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { Profile } from '@/types/domain';
import { InputHTMLAttributes } from 'react';

type PayoutMethod = NonNullable<Profile['preferred_payout_method']>;

type PersonalField = {
  key: 'first_name' | 'second_name' | 'paternal_last_name' | 'celular' | 'email' | 'dni';
  label: string;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
};

const personalFields: PersonalField[] = [
  { key: 'first_name', label: 'Primer nombre', placeholder: 'Ej. María' },
  { key: 'second_name', label: 'Segundo nombre', placeholder: 'Opcional', optional: true },
  { key: 'paternal_last_name', label: 'Apellido paterno', placeholder: 'Opcional', optional: true },
  { key: 'celular', label: 'Celular', placeholder: 'Ej. 987654321', type: 'tel' },
  { key: 'email', label: 'Correo', disabled: true },
  { key: 'dni', label: 'DNI', placeholder: 'Opcional', optional: true }
];

function composeDisplayName(user: Profile, patch?: Partial<Profile>) {
  const firstName = (patch?.first_name ?? user.first_name ?? '').trim();
  const secondName = (patch?.second_name ?? user.second_name ?? '').trim();
  const paternalLastName = (patch?.paternal_last_name ?? user.paternal_last_name ?? '').trim();
  const fullName = [firstName, secondName, paternalLastName].filter(Boolean).join(' ').trim();
  return fullName || user.nombre;
}

function PaymentMethodFields({ user, onUserChange }: { user: Profile; onUserChange: (patch: Partial<Profile>) => void }) {
  const method = user.preferred_payout_method;

  if (!method) return null;

  if (method === 'yape' || method === 'plin') {
    return (
      <div className="space-y-3">
        <LabeledInput
          label="Celular para cobrar"
          placeholder="Ej. 987654321"
          value={user.payout_phone_number ?? ''}
          onChange={(value) => onUserChange({ payout_phone_number: value })}
        />
        <LabeledInput
          label="Titular / alias"
          placeholder="Opcional"
          value={user.payout_account_name ?? ''}
          onChange={(value) => onUserChange({ payout_account_name: value })}
          optional
        />
      </div>
    );
  }

  if (method === 'bank_account') {
    return (
      <div className="space-y-3">
        <LabeledInput
          label="Banco"
          placeholder="Ej. BCP"
          value={user.payout_bank_name ?? ''}
          onChange={(value) => onUserChange({ payout_bank_name: value })}
        />
        <LabeledInput
          label="Número de cuenta"
          placeholder="Ingresa tu cuenta"
          value={user.payout_account_number ?? ''}
          onChange={(value) => onUserChange({ payout_account_number: value })}
        />
        <LabeledInput
          label="CCI"
          placeholder="Opcional"
          value={user.payout_cci ?? ''}
          onChange={(value) => onUserChange({ payout_cci: value })}
          optional
        />
        <LabeledInput
          label="Titular"
          placeholder="Opcional"
          value={user.payout_account_name ?? ''}
          onChange={(value) => onUserChange({ payout_account_name: value })}
          optional
        />
      </div>
    );
  }

  if (method === 'other') {
    return (
      <LabeledInput
        label="Detalle del medio"
        placeholder="Describe cómo quieres recibir el aporte"
        value={user.payout_notes ?? ''}
        onChange={(value) => onUserChange({ payout_notes: value })}
      />
    );
  }

  return (
    <LabeledInput
      label="Indicaciones"
      placeholder="Ej. Coordinación presencial"
      value={user.payout_notes ?? ''}
      onChange={(value) => onUserChange({ payout_notes: value })}
      optional
    />
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  optional,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  optional?: boolean;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-800">
        {label}
        {optional ? <span className="ml-1 font-normal text-slate-500">(opcional)</span> : null}
      </label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}

export function ProfilePanel() {
  const { user, setUser } = useAuthStore();
  if (!user) return null;

  const updateUser = (patch: Partial<Profile>) => {
    setUser({ ...user, ...patch });
  };

  const updatePersonalField = (field: PersonalField['key'], value: string) => {
    if (field === 'email') return;
    const patch = { [field]: value } as Partial<Profile>;
    if (field === 'first_name' || field === 'second_name' || field === 'paternal_last_name') {
      patch.nombre = composeDisplayName(user, patch);
    }
    updateUser(patch);
  };

  return (
    <Card className="max-w-2xl space-y-6 p-5">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Perfil</h1>
        <p className="text-sm text-slate-600">Mantén tus datos personales y tu medio de pago actualizados.</p>
      </div>

      {!user.preferred_payout_method && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Completa tu medio de pago para poder recibir aportes en tus turnos.
        </p>
      )}

      <section className="space-y-3 rounded-md border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Datos personales</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {personalFields.map((field) => (
            <div key={field.key} className={field.key === 'email' ? 'sm:col-span-2' : ''}>
              <LabeledInput
                label={field.label}
                optional={field.optional}
                disabled={field.disabled}
                placeholder={field.placeholder}
                type={field.type}
                value={field.key === 'email' ? user.email : (user[field.key] ?? '')}
                onChange={(value) => updatePersonalField(field.key, value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-slate-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Medio de pago para recibir aportes</h2>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-800">Método preferido</label>
          <Select
            value={user.preferred_payout_method ?? ''}
            onChange={(event) => updateUser({ preferred_payout_method: (event.target.value || undefined) as PayoutMethod | undefined })}
          >
            <option value="">Selecciona método</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="bank_account">Cuenta bancaria</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
        </div>
        <PaymentMethodFields user={user} onUserChange={updateUser} />
      </section>

      <Button type="button">Guardar cambios</Button>
    </Card>
  );
}
