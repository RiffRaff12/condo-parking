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

function normaliseBay(input: string): string {
  const s = input.trim().toUpperCase()
  const m = s.match(/^(LG|L1|G)[\s\-]?(\d{1,3})$/)
  if (!m) throw { code: 'INVALID_BAY' }
  return `${m[1]}-${m[2].padStart(3, '0')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  let body: { name?: string; bay?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { name, bay, email } = body
  if (!name && !bay && !email) return json({ error: 'At least one field required' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const phone = user.user_metadata?.phone
  if (!phone) return json({ error: 'User has no phone in metadata' }, 400)

  const updates: Record<string, string> = {}
  const metaUpdates: Record<string, string> = {}
  if (name)  { updates.name = name.trim().slice(0, 100); metaUpdates.name = updates.name }
  if (bay) {
    try { updates.bay_number = normaliseBay(bay); metaUpdates.bay = updates.bay_number }
    catch { return json({ code: 'INVALID_BAY', message: 'Invalid bay format. Expected: LG-007, G-007 or L1-364' }, 400) }
  }
  if (email) { updates.email = email.trim().slice(0, 200); metaUpdates.email = updates.email }

  const { error: dbErr } = await admin
    .from('residents_directory')
    .update(updates)
    .eq('phone', phone)

  if (dbErr) {
    console.error('Update error:', dbErr)
    return json({ error: 'Failed to update profile' }, 500)
  }

  await admin.auth.admin.updateUserById(user.id, { user_metadata: metaUpdates })

  return json({ updated: true })
})
