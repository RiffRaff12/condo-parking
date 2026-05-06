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

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  // Cancel open requests
  await admin
    .from('requests')
    .update({ status: 'cancelled' })
    .eq('requester_id', user.id)
    .eq('status', 'open')

  // Anonymise historical requests (both as requester and fulfiller)
  await admin
    .from('requests')
    .update({ requester_id: null })
    .eq('requester_id', user.id)

  await admin
    .from('requests')
    .update({ fulfiller_id: null })
    .eq('fulfiller_id', user.id)

  // Remove from residents_directory
  const phone = user.user_metadata?.phone
  if (phone) {
    await admin.from('residents_directory').delete().eq('phone', phone)
  }

  // Delete Supabase auth user
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    console.error('Delete user error:', deleteErr)
    return json({ error: 'Failed to delete account' }, 500)
  }

  return json({ deleted: true })
})
