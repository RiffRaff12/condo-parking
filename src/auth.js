export function createAuth(client) {
  return {
    async verifyAndSignIn({ phone, unit, bay }) {
      // Normalise Malaysian trunk prefix: 0123… → 60123…
      const normalisedPhone = phone.startsWith('0') ? '6' + phone : phone
      const { data, error } = await client.functions.invoke('verify-resident', {
        body: { phone: normalisedPhone, unit, bay },
      })
      if (error) throw new Error('Ralat pelayan. Cuba lagi.')
      if (!data.matched) throw new Error('Maklumat tidak sepadan. Sila semak nombor telefon, unit, dan petak parkir anda.')
      const { error: sessionError } = await client.auth.verifyOtp({
        token_hash: data.hashed_token,
        type: 'magiclink',
      })
      if (sessionError) throw sessionError
      const { data: sessionData } = await client.auth.getSession()
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
