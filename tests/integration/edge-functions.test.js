/**
 * Smoke tests for Supabase edge function deployment configuration.
 *
 * These hit the live Supabase project to catch deployment regressions —
 * specifically, public functions being redeployed without --no-verify-jwt.
 *
 * If a test fails with UNAUTHORIZED_INVALID_JWT_FORMAT, redeploy with:
 *   supabase functions deploy <function-name> --no-verify-jwt
 */

const SUPABASE_URL = 'https://hmfpdpdovzkdhbwolgxy.supabase.co'

async function callFunction(name, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { status: res.status, data }
}

describe('public edge functions — no auth required', () => {
  test('complete-signup is reachable without auth headers', async () => {
    // Empty body → function returns 400 (missing fields), not 401 (JWT error).
    // Failure here means: redeploy with --no-verify-jwt
    const { status, data } = await callFunction('complete-signup')
    expect(data.code).not.toBe('UNAUTHORIZED_INVALID_JWT_FORMAT')
    expect(status).not.toBe(401)
    expect(status).toBe(400)
  }, 15_000)

  test('verify-resident is reachable without auth headers', async () => {
    // Missing fields → function returns { matched: false } with 400, not 401.
    // Failure here means: redeploy with --no-verify-jwt
    const { status, data } = await callFunction('verify-resident')
    expect(data.code).not.toBe('UNAUTHORIZED_INVALID_JWT_FORMAT')
    expect(status).not.toBe(401)
  }, 15_000)
})
