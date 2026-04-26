import { validateRequestForm, validateFulfilForm } from '../src/lib.js'

const VALID_REQ = {
  name: 'Ali', unit: '1-3-7', phone: '0123456789',
  fromDate: '2026-04-27', fromTime: '14:00',
  toDate: '2026-04-27', toTime: '15:00',
}

describe('validateRequestForm', () => {
  test('returns ok:true for valid input', () => {
    expect(validateRequestForm(VALID_REQ).ok).toBe(true)
  })
  test('returns fromISO and toISO on success', () => {
    const r = validateRequestForm(VALID_REQ)
    expect(r.fromISO).toBe('2026-04-27T14:00:00')
    expect(r.toISO).toBe('2026-04-27T15:00:00')
  })
  test('errors when name is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, name: '' }).ok).toBe(false)
  })
  test('errors when unit is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, unit: '' }).ok).toBe(false)
  })
  test('errors when phone is missing', () => {
    expect(validateRequestForm({ ...VALID_REQ, phone: '' }).ok).toBe(false)
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
    const r = validateRequestForm({ ...VALID_REQ, name: '' })
    expect(r.error).toBe('Sila isi semua ruangan sebelum menghantar.')
  })
  test('errors when to time equals from time', () => {
    const r = validateRequestForm({ ...VALID_REQ, toTime: '14:00' })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Masa tamat mesti selepas masa mula.')
  })
  test('errors when to time is before from time', () => {
    const r = validateRequestForm({ ...VALID_REQ, toTime: '13:00' })
    expect(r.ok).toBe(false)
  })
  test('accepts to datetime on a later date even if time is earlier', () => {
    const r = validateRequestForm({ ...VALID_REQ, toDate: '2026-04-28', toTime: '08:00' })
    expect(r.ok).toBe(true)
  })
})

describe('validateFulfilForm', () => {
  const VALID = { fName: 'Siti', fUnit: '2-1-15', fPhone: '0112345678', fBay: 'B1-42' }

  test('returns ok:true for valid input', () => {
    expect(validateFulfilForm(VALID).ok).toBe(true)
  })
  test('errors when fName is missing', () => {
    expect(validateFulfilForm({ ...VALID, fName: '' }).ok).toBe(false)
  })
  test('errors when fUnit is missing', () => {
    expect(validateFulfilForm({ ...VALID, fUnit: '' }).ok).toBe(false)
  })
  test('errors when fPhone is missing', () => {
    expect(validateFulfilForm({ ...VALID, fPhone: '' }).ok).toBe(false)
  })
  test('errors when fBay is missing', () => {
    expect(validateFulfilForm({ ...VALID, fBay: '' }).ok).toBe(false)
  })
  test('error message is correct Malay text', () => {
    expect(validateFulfilForm({ ...VALID, fBay: '' }).error).toBe('Sila isi semua ruangan.')
  })
})
