export type Frecuencia = 'semanal' | 'quincenal' | 'mensual';
export type EstadoJunta = 'borrador' | 'activa' | 'cerrada' | 'bloqueada';
export type TipoJunta = 'normal' | 'incentivo';
export type IncentivoRegla = 'primero_ultimo' | 'escalonado';
export type EstadoMiembro = 'invitado' | 'activo' | 'pendiente' | 'moroso' | 'retirado';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida';
export type EstadoPago =
  | 'pending'
  | 'submitted'
  | 'validating'
  | 'approved'
  | 'rejected'
  | 'overdue';
export type GlobalRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  celular: string;
  dni?: string;
  foto_url?: string;
  global_role?: GlobalRole;
}

export interface Junta {
  id: string;
  admin_id: string;
  slug: string;
  invite_token: string;
  access_code?: string;
  integrantes_actuales?: number;
  is_member_current_user?: boolean;
  tipo_junta?: TipoJunta;
  incentivo_porcentaje?: number;
  incentivo_regla?: IncentivoRegla;
  cuota_base?: number;
  bolsa_base?: number;
  nombre: string;
  descripcion?: string;
  moneda: 'PEN' | 'USD';
  participantes_max: number;
  monto_cuota: number;
  premio_primero_pct: number;
  descuento_ultimo_pct: number;
  fee_plataforma_pct: number;
  frecuencia_pago: Frecuencia;
  fecha_inicio: string;
  dia_limite_pago: number;
  penalidad_mora?: number;
  visibilidad: 'publica' | 'privada';
  cerrar_inscripciones: boolean;
  estado: EstadoJunta;
  created_at: string;
}

export interface JuntaMember {
  id: string;
  junta_id: string;
  profile_id: string;
  estado: EstadoMiembro;
  rol?: 'admin' | 'participante';
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
  payment_method?: 'yape' | 'plin' | 'transferencia' | 'efectivo' | 'otro';
  operation_number?: string;
  participant_note?: string;
  internal_note?: string;
  validated_at?: string;
  validated_by?: string;
  rejection_reason?: string;
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
