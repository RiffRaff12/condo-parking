import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const { phone, unit, bay } = await req.json()

  if (!phone || !unit || !bay) return json({ matched: false }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: resident, error } = await admin
    .from('residents_directory')
    .select('id, phone, unit_number, bay_number')
    .eq('phone', phone)
    .eq('unit_number', unit)
    .eq('bay_number', bay)
    .maybeSingle()

  if (error || !resident) return json({ matched: false })

  // Deterministic email tied to the phone number
  const email = `${phone}@parkitjiran.internal`

  const { data: existingUser } = await admin.auth.admin.getUserByEmail(email)

  let userId: string

  if (existingUser?.user) {
    userId = existingUser.user.id
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
      email,
      email_confirm: true,
      user_metadata: { unit, bay },
    })
    if (createErr || !created.user) return json({ matched: false }, 500)
    userId = created.user.id
  }

  const { data: sessionData, error: sessionErr } = await admin.auth.admin.createSession({ user_id: userId })
  if (sessionErr || !sessionData?.session) return json({ matched: false }, 500)

  return json({
    matched: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  })
})
