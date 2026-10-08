import { describe, expect, it } from 'vitest'
import { apiBaseUrl } from './client'

describe('apiBaseUrl', () => {
  it('sin variable usa el mismo origen', () => {
    expect(apiBaseUrl(undefined)).toBe('/api')
    expect(apiBaseUrl('  ')).toBe('/api')
  })
  it('agrega /api si falta y quita barras finales', () => {
    expect(apiBaseUrl('https://api.ubook.pe')).toBe('https://api.ubook.pe/api')
    expect(apiBaseUrl('https://api.ubook.pe/')).toBe('https://api.ubook.pe/api')
    expect(apiBaseUrl('https://api.ubook.pe/api/')).toBe('https://api.ubook.pe/api')
  })
})
