export function createDb(client) {
  return {
    async createRequest({ requester_id, start_datetime, end_datetime }) {
      const { data, error } = await client
        .from('requests')
        .insert({ requester_id, start_datetime, end_datetime, status: 'open' })
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

    async revokeRequest(requestId, fulfillerId) {
      const { data, error } = await client
        .from('requests')
        .update({ status: 'open', fulfiller_id: null, fulfiller_bay: null })
        .eq('id', requestId)
        .eq('fulfiller_id', fulfillerId)
        .select()
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('UNAUTHORIZED')
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

    async savePushSubscription(userId, subscriptionJson) {
      const { data, error } = await client
        .from('push_subscriptions')
        .upsert({ user_id: userId, subscription_json: subscriptionJson }, { onConflict: 'user_id' })
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
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },

    async fetchClosedRequests() {
      const { data, error } = await client
        .from('requests')
        .select('*')
        .in('status', ['resolved', 'cancelled', 'expired'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  }
}
