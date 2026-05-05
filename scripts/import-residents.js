import { createClient } from '@supabase/supabase-js'
import { read, utils } from 'xlsx'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config()

export function normalisePhone(phone) {
  const digits = phone.replace(/[\s\-]/g, '')
  return digits.startsWith('+60') ? '0' + digits.slice(3) : digits
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node scripts/import-residents.js <path-to-file.xlsx>')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const workbook = read(readFileSync(filePath))
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = utils.sheet_to_json(sheet, { defval: '' })

  let hasError = false

  for (const raw of rows) {
    const normalised = {}
    for (const [k, v] of Object.entries(raw)) {
      normalised[k.toLowerCase().trim()] = String(v).trim()
    }

    const phone = normalisePhone(normalised.phone ?? '')
    const unit  = normalised.unit  ?? ''
    const bay   = normalised.bay   ?? ''
    const name  = normalised.name  ?? ''

    const email = `${phone}@parkitjiran.local`

    const { error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { phone, unit, bay, name },
    })

    if (!error) {
      console.log(`created  ${unit} / ${bay} (${phone})`)
    } else if (error.message?.toLowerCase().includes('already been registered') || error.code === 'email_exists') {
      console.log(`skipped  ${unit} / ${bay} (${phone})`)
    } else {
      console.error(`error    ${unit} / ${bay} (${phone}): ${error.message}`)
      hasError = true
    }
  }

  if (hasError) process.exit(1)
}

if (process.argv[1]?.endsWith('import-residents.js')) {
  main()
}
