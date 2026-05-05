export function createAuth(client, supabaseUrl) {
  return {
    async verifyAndSignIn({ phone, unit, bay }) {
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-resident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, unit, bay }),
      })
      if (!res.ok) throw new Error('Ralat pelayan. Cuba lagi.')
      const data = await res.json()
      if (!data.matched) throw new Error('Maklumat tidak sepadan. Sila semak nombor telefon, unit, dan petak parkir anda.')
      const { data: sessionData, error: sessionError } = await client.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      })
      if (sessionError) throw sessionError
      return sessionData.session
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },

    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session
    },
  }
}
