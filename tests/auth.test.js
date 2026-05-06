import { createAuth } from '../src/auth.js'
import { validateOnboardingForm } from '../src/lib.js'

function mockClient(overrides = {}) {
  return {
    auth: {
      getSession:  vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      verifyOtp:   vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut:     vi.fn().mockResolvedValue({ error: null }),
      ...overrides.auth,
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
      ...overrides.functions,
    },
  }
}

describe('validateOnboardingForm', () => {
  test('returns ok:false when phone is missing', () => {
    expect(validateOnboardingForm({ phone: '', unit: 'A-01', bay: 'P1-01' }).ok).toBe(false)
  })

  test('returns ok:false when unit is missing', () => {
    expect(validateOnboardingForm({ phone: '60123456789', unit: '', bay: 'P1-01' }).ok).toBe(false)
  })

  test('returns ok:false when bay is missing', () => {
    expect(validateOnboardingForm({ phone: '60123456789', unit: 'A-01', bay: '' }).ok).toBe(false)
  })

  test('returns ok:true when all fields are present', () => {
    expect(validateOnboardingForm({ phone: '60123456789', unit: 'A-01', bay: 'P1-01' }).ok).toBe(true)
  })
})

describe('verifyAndSignIn', () => {
  test('throws Malay error when Edge Function returns no-match', async () => {
    const client = mockClient({
      functions: { invoke: vi.fn().mockResolvedValue({ data: { matched: false }, error: null }) },
    })
    const auth = createAuth(client)

    await expect(auth.verifyAndSignIn({ phone: '60199999999', unit: 'Z-99', bay: 'P9-99' }))
      .rejects.toThrow('Maklumat tidak sepadan')
  })

  test('throws Malay server error when invoke returns an error (e.g. invalid JWT rejected by gateway)', async () => {
    const client = mockClient({
      functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error('Invalid JWT') }) },
    })
    const auth = createAuth(client)

    await expect(auth.verifyAndSignIn({ phone: '60123456789', unit: 'A-01', bay: 'P1-01' }))
      .rejects.toThrow('Ralat pelayan. Cuba lagi.')
  })

  test('calls verifyOtp with hashed_token on successful match', async () => {
    const session = { access_token: 'tok', user: { id: 'user-1' } }
    const client = mockClient({
      functions: { invoke: vi.fn().mockResolvedValue({ data: { matched: true, hashed_token: 'hash-abc' }, error: null }) },
      auth: {
        verifyOtp:  vi.fn().mockResolvedValue({ data: {}, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        signOut:    vi.fn(),
      },
    })
    const auth = createAuth(client)

    const result = await auth.verifyAndSignIn({ phone: '60123456789', unit: 'A-01', bay: 'P1-01' })

    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-abc', type: 'magiclink' })
    expect(result).toEqual(session)
  })

  test('propagates verifyOtp error', async () => {
    const client = mockClient({
      functions: { invoke: vi.fn().mockResolvedValue({ data: { matched: true, hashed_token: 'hash-abc' }, error: null }) },
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ data: null, error: new Error('OTP expired') }),
      },
    })
    const auth = createAuth(client)

    await expect(auth.verifyAndSignIn({ phone: '60123456789', unit: 'A-01', bay: 'P1-01' }))
      .rejects.toThrow('OTP expired')
  })
})

describe('signOut', () => {
  test('calls client signOut', async () => {
    const client = mockClient()
    const auth = createAuth(client)

    await auth.signOut()

    expect(client.auth.signOut).toHaveBeenCalled()
  })
})

describe('getSession', () => {
  test('returns session when user is authenticated', async () => {
    const session = { access_token: 'tok', user: { id: 'user-1' } }
    const client = mockClient({ auth: { getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }) } })
    const auth = createAuth(client)

    const result = await auth.getSession()

    expect(result).toEqual(session)
  })

  test('returns null when no session exists', async () => {
    const client = mockClient()
    const auth = createAuth(client)

    const result = await auth.getSession()

    expect(result).toBeNull()
  })
})
