import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')!
const MY_EMAIL          = 'zhariff.hazali@gmail.com'

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

  let body: { message?: string; from_email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const message   = body.message?.trim()
  const fromEmail = body.from_email?.trim()
  if (!message) return json({ error: 'Message is required' }, 400)

  let unit = 'tidak diketahui'
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (user?.user_metadata?.unit) unit = user.user_metadata.unit
  }

  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: {
        username: MY_EMAIL,
        password: GMAIL_APP_PASSWORD,
      },
    },
  })

  const replyTo = fromEmail ? `${fromEmail}` : undefined

  try {
    await client.send({
      from:    `ParkitJiran <${MY_EMAIL}>`,
      to:      MY_EMAIL,
      replyTo,
      subject: '[ParkitJiran] Maklum Balas',
      content: `Unit: ${unit}${fromEmail ? `\nDaripada: ${fromEmail}` : ''}\n\n${message}`,
    })
  } finally {
    await client.close()
  }

  return json({ sent: true })
})
