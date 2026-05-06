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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  let body: { email?: string; otp_code?: string; mode?: string; user_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { email, otp_code, mode, user_id } = body
  if (!email || !otp_code) return json({ error: 'email and otp_code are required' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: pending } = await admin
    .from('pending_signups')
    .select('*')
    .eq('email', email)
    .eq('otp_code', otp_code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pending) return json({ code: 'INVALID_OTP', message: 'Invalid OTP' }, 400)

  if (new Date(pending.expires_at) < new Date()) {
    await admin.from('pending_signups').delete().eq('id', pending.id)
    return json({ code: 'EXPIRED', message: 'OTP has expired' }, 400)
  }

  await admin.from('pending_signups').delete().eq('id', pending.id)

  if (mode === 'email_change' && user_id) {
    const { data: { user: authUser } } = await admin.auth.admin.getUserById(user_id)
    const phone = authUser?.user_metadata?.phone
    if (phone) {
      await admin.from('residents_directory')
        .update({ email: pending.email })
        .eq('phone', phone)
    }
    await admin.auth.admin.updateUserById(user_id, {
      user_metadata: { email: pending.email },
    })
    return json({ updated: true })
  }

  const { error: insertErr } = await admin.from('residents_directory').insert({
    name:        pending.name,
    email:       pending.email,
    phone:       pending.phone,
    unit_number: pending.unit_number,
    bay_number:  pending.bay_number,
  })

  if (insertErr) {
    if (insertErr.code === '23505') return json({ code: 'DUPLICATE', message: 'Already registered' }, 409)
    console.error('Insert error:', insertErr)
    return json({ error: 'Failed to create account' }, 500)
  }

  return json({ created: true })
})
