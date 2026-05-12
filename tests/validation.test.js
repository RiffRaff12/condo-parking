import { validateRequestForm } from '../src/lib.js'

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const VALID_REQ = {
  fromDate: daysFromNow(1), fromTime: '14:00',
  toDate:   daysFromNow(1), toTime:   '15:00',
}

describe('validateRequestForm', () => {
  test('returns ok:true for valid input', () => {
    expect(validateRequestForm(VALID_REQ).ok).toBe(true)
  })
  test('returns fromISO and toISO on success', () => {
    const r = validateRequestForm(VALID_REQ)
    expect(r.fromISO).toBe(`${daysFromNow(1)}T14:00:00`)
    expect(r.toISO).toBe(`${daysFromNow(1)}T15:00:00`)
  })
  test('errors when fromDate is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, fromDate: '' }).ok).toBe(false)
  })
  test('errors when fromTime is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, fromTime: '' }).ok).toBe(false)
  })
  test('errors when toDate is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, toDate: '' }).ok).toBe(false)
  })
  test('errors when toTime is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, toTime: '' }).ok).toBe(false)
  })
  test('missing-field error message is correct Malay text', () => {
    const r = validateRequestForm({ ...VALID_REQ, fromDate: '' })
    expect(r.error).toBe('Sila isi semua ruangan sebelum menghantar.')
  })
  test('errors when to time equals from time', () => {
    const r = validateRequestForm({ ...VALID_REQ, toTime: '14:00' })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Masa tamat mesti selepas masa mula.')
  })
  test('errors when to time is before from time', () => {
    expect(validateRequestForm({ ...VALID_REQ, toTime: '13:00' }).ok).toBe(false)
  })
  test('accepts to datetime on a later date even if time is earlier', () => {
    const r = validateRequestForm({ ...VALID_REQ, toDate: daysFromNow(2), toTime: '08:00' })
    expect(r.ok).toBe(true)
  })
  test('accepts request exactly 3 days in advance', () => {
    // Use 00:00 so the from-time is always ≤ 3 full days from now regardless of when the test runs
    const r = validateRequestForm({ fromDate: daysFromNow(3), fromTime: '00:00', toDate: daysFromNow(3), toTime: '01:00' })
    expect(r.ok).toBe(true)
  })
  test('rejects request more than 3 days in advance', () => {
    const r = validateRequestForm({ fromDate: daysFromNow(4), fromTime: '10:00', toDate: daysFromNow(4), toTime: '11:00' })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Permintaan hanya boleh dibuat 3 hari ke hadapan.')
  })
  test('3-day rejection uses correct Malay text', () => {
    const r = validateRequestForm({ fromDate: daysFromNow(10), fromTime: '09:00', toDate: daysFromNow(10), toTime: '10:00' })
    expect(r.error).toBe('Permintaan hanya boleh dibuat 3 hari ke hadapan.')
  })
})

