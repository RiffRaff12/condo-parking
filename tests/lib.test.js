import { uuid, esc, waPhone, fmtMalay, fmtSlot, loadRequests, saveRequests } from '../src/lib.js'

describe('uuid', () => {
  test('returns a 36-character string', () => {
    expect(uuid()).toHaveLength(36)
  })
  test('matches UUID v4 format', () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  test('generates unique values', () => {
    expect(uuid()).not.toBe(uuid())
  })
})

describe('esc', () => {
  test('escapes < and >', () => {
    expect(esc('<b>')).toBe('&lt;b&gt;')
  })
  test('escapes &', () => {
    expect(esc('a & b')).toBe('a &amp; b')
  })
  test('escapes double quotes', () => {
    expect(esc('"hi"')).toBe('&quot;hi&quot;')
  })
  test('escapes all four special chars in one string', () => {
    expect(esc('<b>bold</b> & "quoted"')).toBe('&lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;')
  })
  test('passes through safe strings unchanged', () => {
    expect(esc('hello world')).toBe('hello world')
  })
  test('coerces non-strings via String()', () => {
    expect(esc(123)).toBe('123')
  })
  test('handles empty string', () => {
    expect(esc('')).toBe('')
  })
})

describe('waPhone', () => {
  test('converts leading 0 to 60', () => {
    expect(waPhone('0123456789')).toBe('60123456789')
  })
  test('leaves already-60 prefix alone', () => {
    expect(waPhone('60123456789')).toBe('60123456789')
  })
  test('strips + sign from +60 prefix', () => {
    expect(waPhone('+60123456789')).toBe('60123456789')
  })
  test('strips hyphens and spaces', () => {
    expect(waPhone('012-345 6789')).toBe('60123456789')
  })
  test('handles empty string', () => {
    expect(waPhone('')).toBe('')
  })
  test('handles landline starting with 03', () => {
    expect(waPhone('03-12345678')).toBe('60312345678')
  })
})

// 2026-04-27 is a Monday
describe('fmtMalay', () => {
  test('midnight (00:00) → tgh. malam', () => {
    expect(fmtMalay('2026-04-27T00:00:00')).toBe('Isnin, 27 Apr 2026, 12:00 tgh. malam')
  })
  test('morning (09:00) → pagi', () => {
    expect(fmtMalay('2026-04-27T09:00:00')).toBe('Isnin, 27 Apr 2026, 9:00 pagi')
  })
  test('noon (12:00) → tgh. hari', () => {
    expect(fmtMalay('2026-04-27T12:00:00')).toBe('Isnin, 27 Apr 2026, 12:00 tgh. hari')
  })
  test('afternoon (14:00) → petang', () => {
    expect(fmtMalay('2026-04-27T14:00:00')).toBe('Isnin, 27 Apr 2026, 2:00 petang')
  })
  test('evening (23:00) → petang', () => {
    expect(fmtMalay('2026-04-27T23:00:00')).toBe('Isnin, 27 Apr 2026, 11:00 petang')
  })
  test('uses Malay month name Ogos for August', () => {
    expect(fmtMalay('2026-08-01T10:00:00')).toContain('Ogos')
  })
  test('uses Malay day name Sabtu for Saturday', () => {
    expect(fmtMalay('2026-05-02T10:00:00')).toContain('Sabtu')
  })
})

// 2026-04-27 is a Monday
describe('fmtSlot', () => {
  test('returns object with dow, date, time keys', () => {
    const s = fmtSlot('2026-04-27T14:00:00')
    expect(s).toHaveProperty('dow')
    expect(s).toHaveProperty('date')
    expect(s).toHaveProperty('time')
  })
  test('afternoon (14:00) → 2:00ptg', () => {
    expect(fmtSlot('2026-04-27T14:00:00').time).toBe('2:00ptg')
  })
  test('midnight (00:00) → 12:00mlm', () => {
    expect(fmtSlot('2026-04-27T00:00:00').time).toBe('12:00mlm')
  })
  test('noon (12:00) → 12:00tgh', () => {
    expect(fmtSlot('2026-04-27T12:00:00').time).toBe('12:00tgh')
  })
  test('morning (09:00) → 9:00pgi', () => {
    expect(fmtSlot('2026-04-27T09:00:00').time).toBe('9:00pgi')
  })
  test('short day name for Monday is Mon', () => {
    expect(fmtSlot('2026-04-27T14:00:00').dow).toBe('Mon')
  })
  test('date field is formatted as "D Mon"', () => {
    expect(fmtSlot('2026-04-27T14:00:00').date).toBe('27 Apr')
  })
})

describe('loadRequests / saveRequests', () => {
  beforeEach(() => localStorage.clear())

  test('returns [] when localStorage is empty', () => {
    expect(loadRequests()).toEqual([])
  })
  test('returns [] when localStorage value is null', () => {
    localStorage.removeItem('parkitjiran_v2')
    expect(loadRequests()).toEqual([])
  })
  test('returns [] on corrupted JSON', () => {
    localStorage.setItem('parkitjiran_v2', 'not-json{')
    expect(loadRequests()).toEqual([])
  })
  test('round-trips a saved list correctly', () => {
    const items = [{ id: '1', name: 'Ali', status: 'open' }]
    saveRequests(items)
    expect(loadRequests()).toEqual(items)
  })
  test('preserves order of items', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }]
    saveRequests(items)
    expect(loadRequests().map(r => r.id)).toEqual(['1', '2', '3'])
  })
  test('saves and loads empty array', () => {
    saveRequests([])
    expect(loadRequests()).toEqual([])
  })
  test('ignores unrelated localStorage keys', () => {
    localStorage.setItem('other_key', '[{"id":"x"}]')
    expect(loadRequests()).toEqual([])
  })
  test('overwrites previous data on save', () => {
    saveRequests([{ id: '1' }])
    saveRequests([{ id: '2' }])
    expect(loadRequests()).toEqual([{ id: '2' }])
  })
})
