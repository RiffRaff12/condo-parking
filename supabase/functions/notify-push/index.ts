import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_CONTACT     = Deno.env.get('VAPID_CONTACT') ?? 'mailto:admin@parkitjiran.app'

webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  fulfilled: {
    title: 'Permintaan anda dipenuhi!',
    body: 'Jiran anda telah menawarkan petak parking.',
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  let body: { request_id?: string; event?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { request_id, event } = body
  if (!request_id || !event || !MESSAGES[event]) return json({ error: 'Invalid payload' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

  const { data: request, error: reqErr } = await admin
    .from('requests')
    .select('requester_id')
    .eq('id', request_id)
    .single()
  if (reqErr || !request) return json({ error: 'Not found' }, 404)

  if (request.requester_id === user.id) return json({ sent: false })

  const { data: sub } = await admin
    .from('push_subscriptions')
    .select('subscription_json')
    .eq('user_id', request.requester_id)
    .maybeSingle()

  if (!sub) return json({ sent: false })

  const msg = MESSAGES[event]
  try {
    await webpush.sendNotification(sub.subscription_json, JSON.stringify(msg))
    return json({ sent: true })
  } catch (e: any) {
    if (e.statusCode === 410) {
      await admin.from('push_subscriptions').delete().eq('user_id', request.requester_id)
    }
    return json({ sent: false })
  }
})
