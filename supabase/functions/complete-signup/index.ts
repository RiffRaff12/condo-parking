import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^60/, '0')
  if (!/^01\d{8,9}$/.test(digits)) throw { code: 'INVALID_PHONE' }
  return digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  let body: { name?: string; email?: string; phone?: string; unit_number?: string; bay_number?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { name, email, unit_number, bay_number } = body
  if (!name || !email || !body.phone || !unit_number || !bay_number)
    return json({ error: 'All fields are required' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // Verify the OTP session — user must be authenticated via Supabase email OTP
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Ensure the session email matches what was submitted (prevent token reuse)
  if (user.email !== email) return json({ error: 'Email mismatch' }, 403)

  let phone: string
  try { phone = '6' + normalisePhone(body.phone) }
  catch { return json({ code: 'INVALID_PHONE', message: 'Invalid phone' }, 400) }

  const unit = unit_number.trim().toUpperCase()
  const bay  = bay_number.trim().toUpperCase()

  const { error: insertErr } = await admin.from('residents_directory').insert({
    name: name.trim().slice(0, 100),
    email,
    phone,
    unit_number: unit,
    bay_number:  bay,
  })

  if (insertErr) {
    if (insertErr.code === '23505') return json({ code: 'DUPLICATE', message: 'Already registered' }, 409)
    console.error('Insert error:', insertErr)
    return json({ error: 'Failed to create account' }, 500)
  }

  // Delete the temporary email-based auth user — login uses phone+unit+bay via verify-resident
  await admin.auth.admin.deleteUser(user.id)

  return json({ created: true })
})
