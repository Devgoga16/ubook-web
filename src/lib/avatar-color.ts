/**
 * Paleta para profesionales y clientes (azules noche, pizarra y ámbar oscuro),
 * con contraste ≥ 4.5:1 para las iniciales en blanco.
 */
export const AVATAR_COLORS = ['#243352', '#2F5D8A', '#8F5400', '#3E5C76', '#1F6F78', '#7A4B1E', '#4A4F8C', '#5A6478']

/** Color estable a partir del nombre. */
export function colorFor(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}
