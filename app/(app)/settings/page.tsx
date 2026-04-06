import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <Card className="space-y-2">
      <h1 className="text-xl font-semibold">Configuración</h1>
      <p className="text-sm text-slate-600">MVP listo para futuras integraciones de correo/WhatsApp y webhooks.</p>
    </Card>
  );
}
