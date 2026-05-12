export async function completeSignup(supabaseUrl, anonKey, { name, email, phone, unit_number, bay_number }) {
  return fetch(`${supabaseUrl}/functions/v1/complete-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ name, email, phone, unit_number, bay_number }),
  })
}
