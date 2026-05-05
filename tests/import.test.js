import { normalisePhone } from '../scripts/import-residents.js'

describe('normalisePhone', () => {
  test('strips spaces', () => {
    expect(normalisePhone('012 345 6789')).toBe('0123456789')
  })

  test('strips hyphens', () => {
    expect(normalisePhone('012-345-6789')).toBe('0123456789')
  })

  test('converts +60 prefix to 0', () => {
    expect(normalisePhone('+60123456789')).toBe('0123456789')
  })

  test('leaves already-clean 0-prefix untouched', () => {
    expect(normalisePhone('0123456789')).toBe('0123456789')
  })

  test('handles mixed spaces and +60 prefix', () => {
    expect(normalisePhone('+60 12-345 6789')).toBe('0123456789')
  })
})
