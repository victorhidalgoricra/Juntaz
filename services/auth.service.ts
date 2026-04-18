function getNormalizedMessage(errorOrMessage: unknown) {
  if (typeof errorOrMessage === 'string') return errorOrMessage.toLowerCase();
  if (errorOrMessage instanceof Error) return errorOrMessage.message.toLowerCase();
  return '';
}

export function mapAuthErrorMessage(message: string) {
  const normalized = getNormalizedMessage(message);

  if (normalized.includes('email not confirmed')) return 'Debes confirmar tu correo antes de ingresar.';
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.';
  }

  if (
    normalized.includes('profiles_dni_unique_digits_idx')
    || normalized.includes('duplicate key value') && normalized.includes('dni')
    || normalized.includes('dni_format_chk')
    || normalized.includes('el dni es obligatorio')
  ) {
    return 'Este DNI ya está registrado.';
  }

  if (
    normalized.includes('profiles_celular_unique_digits_idx')
    || normalized.includes('duplicate key value') && normalized.includes('celular')
    || normalized.includes('el celular es obligatorio')
  ) {
    return 'Este celular ya está registrado.';
  }

  if (normalized.includes('database error saving new user')) {
    return 'No se pudo completar tu registro. Intenta nuevamente.';
  }

  if (normalized.includes('error sending confirmation email')) {
    return 'No se pudo enviar el correo de confirmación. Intenta nuevamente en unos minutos.';
  }

  if (normalized.includes('smtp') || normalized.includes('email provider')) {
    return 'No pudimos enviar el correo. Revisa la configuración de correo en Supabase.';
  }

  return 'No se pudo completar la autenticación. Intenta nuevamente.';
}

export function mapRegisterErrorMessage(message: string) {
  const normalized = getNormalizedMessage(message);

  if (normalized.includes('check_profile_conflicts')) {
    return 'No pudimos validar tus datos en este momento. Intenta nuevamente en unos segundos.';
  }

  if (normalized.includes('profile_sync_failed')) {
    return 'Se creó el usuario, pero no se pudo guardar su perfil. Intenta nuevamente.';
  }

  if (normalized.includes('invalid') || normalized.includes('validation')) {
    return 'Datos inválidos. Revisa la información ingresada.';
  }

  return mapAuthErrorMessage(message);
}
