export function createDb(client) {
  return {
    async createRequest({ requester_id, requester_phone, requester_name, start_datetime, end_datetime }) {
      const { data, error } = await client
        .from('requests')
        .insert({ requester_id, requester_phone, requester_name, start_datetime, end_datetime, status: 'open' })
        .select()
        .single()
      if (error) throw error
      return data
    },

    async fulfillRequest(requestId, { fulfiller_id, fulfiller_bay }) {
      const { data, error } = await client
        .from('requests')
        .update({ status: 'resolved', fulfiller_id, fulfiller_bay })
        .eq('id', requestId)
        .eq('status', 'open')
        .select()
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('RACE_CONDITION')
      return data
    },

    async cancelRequest(requestId, userId) {
      const { data, error } = await client
        .from('requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('requester_id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },


    async fetchOpenRequests() {
      const { data, error } = await client
        .from('requests')
        .select('*')
        .eq('status', 'open')
        .gt('end_datetime', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },

    async fetchClosedRequests(userId) {
      const { data, error } = await client
        .from('requests')
        .select('*')
        .in('status', ['resolved', 'cancelled', 'expired'])
        .eq('requester_id', userId)
        .limit(20)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  }
}
