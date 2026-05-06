import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!

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

function normaliseUnit(input: string): string {
  return input.trim().toUpperCase()
}

function normaliseBay(input: string): string {
  return input.trim().toUpperCase()
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  let body: {
    name?: string; email?: string; phone?: string
    unit_number?: string; bay_number?: string; mode?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { name, email, unit_number, bay_number, mode } = body

  if (!name || !email || !body.phone || !unit_number || !bay_number) {
    return json({ error: 'All fields are required' }, 400)
  }

  let phone: string
  try {
    phone = normalisePhone(body.phone)
  } catch {
    return json({ code: 'INVALID_PHONE', message: 'Invalid Malaysian mobile number' }, 400)
  }

  const unit = normaliseUnit(unit_number)
  const bay  = normaliseBay(bay_number)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  if (mode !== 'email_change') {
    const { data: existing } = await admin
      .from('residents_directory')
      .select('id')
      .eq('phone', phone)
      .eq('unit_number', unit)
      .eq('bay_number', bay)
      .maybeSingle()

    if (existing) return json({ code: 'DUPLICATE', message: 'Already registered' }, 409)
  }

  const otp       = generateOtp()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await admin.from('pending_signups').insert({
    name, email, phone, unit_number: unit, bay_number: bay,
    otp_code: otp, expires_at: expiresAt,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ParkitJiran <noreply@parkitjiran.app>',
      to: email,
      subject: 'Kod OTP ParkitJiran anda',
      text: `Kod OTP anda ialah: ${otp}\n\nKod ini sah selama 15 minit. Jangan kongsi kod ini dengan sesiapa.`,
    }),
  })

  if (!res.ok) {
    console.error('Resend error:', await res.text())
    return json({ error: 'Failed to send OTP email' }, 500)
  }

  return json({ sent: true })
})
