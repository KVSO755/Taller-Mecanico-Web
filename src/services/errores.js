const MENSAJES_DEFECTO = {
  login: 'No se pudo iniciar sesión. Intenta de nuevo.',
  registro: 'No se pudo crear la cuenta. Intenta de nuevo.',
  cargar: 'No se pudieron cargar los datos. Intenta de nuevo.',
  guardar: 'No se pudo guardar. Intenta de nuevo.',
}

export const MENSAJE_RED = 'No se pudo conectar. Revisa tu internet e intenta de nuevo.'

export function traducirError(error, contexto = 'guardar') {
  const msg = String(error?.message ?? '')
  const code = error?.code

  const esRed =
    error?.status === 0 ||
    (error instanceof TypeError && /fetch|network/i.test(msg)) ||
    /failed to fetch|networkerror|load failed/i.test(msg) ||
    error?.name === 'AuthRetryableFetchError'
  if (esRed) return MENSAJE_RED

  if (code === '23505') {
    return /placa/i.test(`${msg} ${error?.details ?? ''}`)
      ? 'Ya hay un vehículo registrado con esta placa.'
      : 'Ese registro ya existe.'
  }
  if (code === '22001') return 'Alguno de los textos es demasiado largo. Acórtalo e intenta de nuevo.'
  if (code === '22003' || code === '22P02' || code === '23514') {
    return 'Alguno de los valores no es válido. Revísalos e intenta de nuevo.'
  }

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
    return 'Correo o contraseña incorrectos.'
  }
  if (code === 'user_already_exists' || /already registered/i.test(msg)) {
    return 'Ya existe una cuenta con este correo.'
  }
  if (code === 'weak_password' || /Password should be at least/i.test(msg)) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (code === 'P0001' && msg) return msg

  return MENSAJES_DEFECTO[contexto] ?? MENSAJES_DEFECTO.guardar
}
