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

function normaliseUnit(input: string): string {
  const s = input.trim().toUpperCase()
  const m = s.match(/^([12])[\s\-]+([G]|\d{1,2})[\s\-]+(\d{1,2})$/)
  if (!m) throw { code: 'INVALID_UNIT' }
  const floor = m[2] === 'G' ? 'G' : m[2].padStart(2, '0')
  return `${m[1]}-${floor}-${m[3].padStart(2, '0')}`
}

function normaliseBay(input: string): string {
  const s = input.trim().toUpperCase()
  const m = s.match(/^(LG|L1|G)[\s\-]?(\d{1,3})$/)
  if (!m) throw { code: 'INVALID_BAY' }
  return `${m[1]}-${m[2].padStart(3, '0')}`
}

Deno.serve(async (req) => {
  try {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const { phone: rawPhone, unit: rawUnit, bay: rawBay } = await req.json()

  if (!rawPhone || !rawUnit || !rawBay) return json({ matched: false }, 400)

  // Normalise Malaysian trunk prefix: 0123… → 60123…
  const phone = rawPhone.startsWith('0') ? '6' + rawPhone : rawPhone

  let unit: string, bay: string
  try { unit = normaliseUnit(rawUnit) } catch { return json({ matched: false }, 400) }
  try { bay  = normaliseBay(rawBay)  } catch { return json({ matched: false }, 400) }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: resident, error } = await admin
    .from('residents_directory')
    .select('id, phone, unit_number, bay_number, name, email')
    .eq('phone', phone)
    .eq('unit_number', unit)
    .eq('bay_number', bay)
    .maybeSingle()

  if (error || !resident) return json({ matched: false })

  // Deterministic email tied to the phone number
  const internalEmail = `${phone}@parkitjiran.internal`

  const userMeta = {
    unit, bay, phone,
    name:  resident.name  || '',
    email: resident.email || '',
  }

  // Create auth user if they don't exist yet; ignore error if they already do.
  // Phone is stored only in user_metadata — not as a Supabase auth phone — to
  // avoid E.164 validation rejecting local-format numbers (e.g. 601xxx vs +601xxx).
  const { data: newUserData } = await admin.auth.admin.createUser({
    email: internalEmail,
    email_confirm: true,
    user_metadata: userMeta,
  })

  // Sync latest resident data to metadata on every login
  if (!newUserData?.user?.id) {
    // User already existed — find their ID and update metadata
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const uid = listData?.users?.find((u: { email?: string }) => u.email === internalEmail)?.id
    if (uid) await admin.auth.admin.updateUserById(uid, { user_metadata: userMeta })
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: internalEmail,
  })

  if (linkErr || !linkData?.properties?.hashed_token) return json({ matched: false }, 500)

  return json({ matched: true, hashed_token: linkData.properties.hashed_token })
  } catch (err) {
    console.error('unhandled exception:', err instanceof Error ? err.message : String(err))
    return json({ matched: false }, 500)
  }
})
