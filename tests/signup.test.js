import { completeSignup } from '../src/signup.js'

const SUPABASE_URL = 'https://example.supabase.co'
const ANON_KEY     = 'test-anon-key'

const VALID_PAYLOAD = {
  name:        'Ahmad bin Ali',
  email:       'ahmad@example.com',
  phone:       '0123456789',
  unit_number: '1-G-07',
  bay_number:  'LG-007',
}

function mockFetch(response = { ok: true, body: { created: true } }) {
  const fn = vi.fn().mockResolvedValue({
    ok:   response.ok,
    json: async () => response.body,
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => { vi.unstubAllGlobals() })

describe('completeSignup — request headers', () => {
  test('sends apikey header with anon key', async () => {
    const fetch = mockFetch()
    await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ apikey: ANON_KEY }) }),
    )
  })

  test('sends Authorization: Bearer <anon-key> header', async () => {
    const fetch = mockFetch()
    await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${ANON_KEY}` }) }),
    )
  })

  test('calls the correct edge function endpoint', async () => {
    const fetch = mockFetch()
    await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(fetch).toHaveBeenCalledWith(
      `${SUPABASE_URL}/functions/v1/complete-signup`,
      expect.any(Object),
    )
  })

  test('sends all required fields in request body', async () => {
    const fetch = mockFetch()
    await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body).toEqual(VALID_PAYLOAD)
  })

  test('uses POST method', async () => {
    const fetch = mockFetch()
    await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('completeSignup — response passthrough', () => {
  test('returns the fetch Response object', async () => {
    mockFetch({ ok: true, body: { created: true } })
    const res = await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(res.ok).toBe(true)
    expect(await res.json()).toEqual({ created: true })
  })

  test('returns non-ok response without throwing', async () => {
    mockFetch({ ok: false, body: { code: 'DUPLICATE_PHONE' } })
    const res = await completeSignup(SUPABASE_URL, ANON_KEY, VALID_PAYLOAD)
    expect(res.ok).toBe(false)
    expect((await res.json()).code).toBe('DUPLICATE_PHONE')
  })
})
