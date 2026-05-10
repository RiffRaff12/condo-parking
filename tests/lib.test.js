import { esc, waPhone, fmtMalay, fmtSlot, buildWhatsAppLink, buildWhatsAppFulfilLink, normalisePhone, normaliseUnit, normaliseBay } from '../src/lib.js'

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

describe('buildWhatsAppLink', () => {
  test('produces a wa.me URL', () => {
    expect(buildWhatsAppLink('0123456789')).toBe('https://wa.me/60123456789')
  })

  test('handles already-international number', () => {
    expect(buildWhatsAppLink('60123456789')).toBe('https://wa.me/60123456789')
  })
})

describe('buildWhatsAppFulfilLink', () => {
  const START = '2026-05-01T08:00:00'
  const END   = '2026-05-01T10:00:00'
  const BAY   = 'A1-01'

  test('produces a wa.me URL with the requester phone number', () => {
    const url = buildWhatsAppFulfilLink('0123456789', BAY, START, END)
    expect(url).toMatch(/^https:\/\/wa\.me\/60123456789/)
  })

  test('includes a ?text= query param', () => {
    const url = buildWhatsAppFulfilLink('0123456789', BAY, START, END)
    expect(url).toContain('?text=')
  })

  test('encoded message contains the fulfiller bay', () => {
    const url = buildWhatsAppFulfilLink('0123456789', BAY, START, END)
    const text = decodeURIComponent(url.split('?text=')[1])
    expect(text).toContain(BAY)
  })

  test('encoded message contains the start time in Malay', () => {
    const url = buildWhatsAppFulfilLink('0123456789', BAY, START, END)
    const text = decodeURIComponent(url.split('?text=')[1])
    expect(text).toContain(fmtMalay(START))
  })

  test('encoded message contains the end time in Malay', () => {
    const url = buildWhatsAppFulfilLink('0123456789', BAY, START, END)
    const text = decodeURIComponent(url.split('?text=')[1])
    expect(text).toContain(fmtMalay(END))
  })

  test('handles +60 prefix on requester phone', () => {
    const url = buildWhatsAppFulfilLink('+60123456789', BAY, START, END)
    expect(url).toMatch(/^https:\/\/wa\.me\/60123456789/)
  })
})

describe('normalisePhone', () => {
  test('strips dashes, spaces, and parentheses from a valid number', () => {
    expect(normalisePhone('(012) 345-6789')).toBe('0123456789')
  })
  test('accepts a valid 10-digit Malaysian mobile', () => {
    expect(normalisePhone('0123456789')).toBe('0123456789')
  })
  test('accepts a valid 11-digit Malaysian mobile', () => {
    expect(normalisePhone('01234567890')).toBe('01234567890')
  })
  test('normalises +60 international prefix to local 0 prefix', () => {
    expect(normalisePhone('+60123456789')).toBe('0123456789')
  })
  test('normalises 60 international prefix to local 0 prefix', () => {
    expect(normalisePhone('60123456789')).toBe('0123456789')
  })
  test('throws INVALID_PHONE for non-01 prefix (e.g. landline 03)', () => {
    expect(() => normalisePhone('0312345678')).toThrow(expect.objectContaining({ code: 'INVALID_PHONE' }))
  })
  test('throws INVALID_PHONE when number is too short after normalisation', () => {
    expect(() => normalisePhone('01234567')).toThrow(expect.objectContaining({ code: 'INVALID_PHONE' }))
  })
  test('throws INVALID_PHONE when number is too long after normalisation', () => {
    expect(() => normalisePhone('012345678901')).toThrow(expect.objectContaining({ code: 'INVALID_PHONE' }))
  })
  test('throws INVALID_PHONE for empty string', () => {
    expect(() => normalisePhone('')).toThrow(expect.objectContaining({ code: 'INVALID_PHONE' }))
  })
})

describe('normaliseUnit', () => {
  test('uppercases lowercase letters', () => {
    expect(normaliseUnit('a-12-3')).toBe('A-12-3')
  })
  test('trims leading and trailing whitespace', () => {
    expect(normaliseUnit('  A12  ')).toBe('A12')
  })
  test('passes through an already-normalised value unchanged', () => {
    expect(normaliseUnit('B-05')).toBe('B-05')
  })
  test('returns empty string for empty input', () => {
    expect(normaliseUnit('')).toBe('')
  })
})

describe('normaliseBay', () => {
  test('uppercases lowercase letters', () => {
    expect(normaliseBay('p-07')).toBe('P-07')
  })
  test('trims leading and trailing whitespace', () => {
    expect(normaliseBay('  B2  ')).toBe('B2')
  })
  test('passes through an already-normalised value unchanged', () => {
    expect(normaliseBay('C-11')).toBe('C-11')
  })
  test('returns empty string for empty input', () => {
    expect(normaliseBay('')).toBe('')
  })
})
