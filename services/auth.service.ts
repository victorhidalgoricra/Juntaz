export function mapAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.';
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('user already registered')) return 'Este correo ya está registrado.';
  if (normalized.includes('smtp') || normalized.includes('email provider')) {
    return 'No pudimos enviar el correo. Revisa la configuración de correo en Supabase.';
  }
  return 'Ocurrió un error de autenticación. Intenta nuevamente.';
}
