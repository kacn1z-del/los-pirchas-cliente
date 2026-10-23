// Reglas del programa de cliente frecuente de Los Pirchas.
// Si cambian, se cambian solo aquí.

export const PUNTOS_POR_COLON = 1000; // 1 punto por cada ₡1.000 cobrados
export const PUNTOS_PARA_CANJE = 100; // con 100 puntos se canjea un plato
export const DESCUENTO_CANJE_MAXIMO = 5000; // el plato canjeado vale hasta ₡5.000

// Normaliza un teléfono de Costa Rica a 506 + 8 dígitos.
// Devuelve null si no es válido, para no crear tarjetas con datos basura.
export function normalizarTelefono(raw) {
  const digitos = String(raw || '').replace(/\D/g, '');
  if (digitos.length === 8) return `506${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('506')) return digitos;
  return null;
}

// Puntos que genera un cobro. El cargo de envío express no suma puntos.
export function puntosPorCobro(total, envioExpress = 0) {
  const base = Math.max(0, Number(total || 0) - Number(envioExpress || 0));
  return Math.floor(base / PUNTOS_POR_COLON);
}

export function puedeCanjear(puntos) {
  return Number(puntos || 0) >= PUNTOS_PARA_CANJE;
}
