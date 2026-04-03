export type Frecuencia = 'semanal' | 'quincenal' | 'mensual';
export type EstadoJunta = 'borrador' | 'activa' | 'cerrada';
export type EstadoMiembro = 'invitado' | 'activo' | 'pendiente' | 'moroso' | 'retirado';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida';
export type EstadoPago = 'pendiente_aprobacion' | 'aprobado' | 'rechazado';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  celular: string;
  dni?: string;
  foto_url?: string;
}

export interface Junta {
  id: string;
  admin_id: string;
  nombre: string;
  descripcion?: string;
  moneda: 'PEN' | 'USD';
  participantes_max: number;
  monto_cuota: number;
  frecuencia_pago: Frecuencia;
  fecha_inicio: string;
  dia_limite_pago: number;
  penalidad_mora?: number;
  visibilidad: 'privada' | 'invitacion';
  cerrar_inscripciones: boolean;
  estado: EstadoJunta;
  created_at: string;
}

export interface JuntaMember {
  id: string;
  junta_id: string;
  profile_id: string;
  estado: EstadoMiembro;
  orden_turno: number;
}

export interface PaymentSchedule {
  id: string;
  junta_id: string;
  cuota_numero: number;
  fecha_vencimiento: string;
  monto: number;
  estado: EstadoCuota;
}

export interface Payment {
  id: string;
  junta_id: string;
  schedule_id: string;
  profile_id: string;
  monto: number;
  estado: EstadoPago;
  comprobante_url?: string;
  pagado_en: string;
}

export interface Payout {
  id: string;
  junta_id: string;
  ronda_numero: number;
  profile_id: string;
  monto_pozo: number;
  entregado_en?: string;
  observaciones?: string;
}

export interface Notification {
  id: string;
  profile_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}
