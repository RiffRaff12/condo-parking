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

function normaliseUnit(input: string): string {
  const s = input.trim().toUpperCase()
  const m = s.match(/^([12])[\s\-]+(LG|G|1[0-5]|0?[1-9])[\s\-]+(\d{1,2})$/)
  if (!m) throw { code: 'INVALID_UNIT' }
  const floor = /^\d+$/.test(m[2]) ? m[2].padStart(2, '0') : m[2]
  const unit  = m[3].padStart(2, '0')
  return `${m[1]}-${floor}-${unit}`
}

function normaliseBay(input: string): string {
  const s = input.trim().toUpperCase()
  const m = s.match(/^(LG|L1|G)[\s\-]?(\d{1,3})$/)
  if (!m) throw { code: 'INVALID_BAY' }
  return `${m[1]}-${m[2].padStart(3, '0')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    let body: { name?: string; email?: string; phone?: string; unit_number?: string; bay_number?: string } = {}
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { name, email, unit_number, bay_number } = body
    if (!name || !email || !body.phone || !unit_number || !bay_number)
      return json({ error: 'All fields are required' }, 400)

    let phone: string
    try { phone = '6' + normalisePhone(body.phone) }
    catch { return json({ code: 'INVALID_PHONE', message: 'Invalid Malaysian mobile number' }, 400) }

    let unit: string, bay: string
    try { unit = normaliseUnit(unit_number) }
    catch { return json({ code: 'INVALID_UNIT', message: 'Invalid unit format. Expected: 1-LG-07, 1-G-07, or 2-10-16' }, 400) }
    try { bay = normaliseBay(bay_number) }
    catch { return json({ code: 'INVALID_BAY', message: 'Invalid bay format. Expected: LG-007, G-007 or L1-364' }, 400) }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    const { data: phoneRow } = await admin
      .from('residents_directory').select('id').eq('phone', phone).maybeSingle()
    if (phoneRow) return json({ code: 'DUPLICATE_PHONE', message: 'Phone already registered' }, 409)

    const { data: unitRow } = await admin
      .from('residents_directory').select('id').eq('unit_number', unit).maybeSingle()
    if (unitRow) return json({ code: 'DUPLICATE_UNIT', message: 'Unit already registered' }, 409)

    const { data: bayRow } = await admin
      .from('residents_directory').select('id').eq('bay_number', bay).maybeSingle()
    if (bayRow) return json({ code: 'DUPLICATE_BAY', message: 'Bay already registered' }, 409)

    const { error: insertErr } = await admin.from('residents_directory').insert({
      name:        name.trim().slice(0, 100),
      email:       email.trim().slice(0, 200),
      phone,
      unit_number: unit,
      bay_number:  bay,
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        if (insertErr.message.includes('phone'))       return json({ code: 'DUPLICATE_PHONE', message: 'Phone already registered' }, 409)
        if (insertErr.message.includes('unit_number')) return json({ code: 'DUPLICATE_UNIT',  message: 'Unit already registered' }, 409)
        if (insertErr.message.includes('bay_number'))  return json({ code: 'DUPLICATE_BAY',   message: 'Bay already registered' }, 409)
        return json({ code: 'DUPLICATE', message: 'Already registered' }, 409)
      }
      console.error('Insert error:', insertErr)
      return json({ error: 'Failed to create account' }, 500)
    }

    return json({ created: true })
  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: 'Server error' }, 500)
  }
})
