import { createDb } from '../src/db.js'

function mockClient(overrides = {}) {
  const builder = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    order:       vi.fn().mockResolvedValue({ data: [], error: null }),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  }
}

describe('createRequest', () => {
  test('returns the created request row', async () => {
    const input = { requester_id: 'user-42', start_datetime: '2026-05-01T08:00:00Z', end_datetime: '2026-05-01T10:00:00Z' }
    const created = { id: 'abc', status: 'open', ...input, created_at: '2026-05-01T07:00:00Z' }
    const client = mockClient()
    client._builder.single.mockResolvedValue({ data: created, error: null })
    const db = createDb(client)

    const result = await db.createRequest(input)

    expect(result).toEqual(created)
  })

  test('inserts requester_id and status open', async () => {
    const client = mockClient()
    client._builder.single.mockResolvedValue({ data: { id: '1' }, error: null })
    const db = createDb(client)

    await db.createRequest({ requester_id: 'user-7', start_datetime: '2026-05-01T08:00:00Z', end_datetime: '2026-05-01T10:00:00Z' })

    expect(client._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ requester_id: 'user-7', status: 'open' })
    )
  })

  test('throws when Supabase returns an error', async () => {
    const client = mockClient()
    client._builder.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const db = createDb(client)

    await expect(db.createRequest({ requester_id: 'user-1', start_datetime: '', end_datetime: '' }))
      .rejects.toMatchObject({ message: 'insert failed' })
  })
})

describe('fulfillRequest', () => {
  test('returns updated request with resolved status and fulfiller info', async () => {
    const updated = { id: '1', status: 'resolved', fulfiller_id: 'user-99', fulfiller_bay: 'C-05' }
    const client = mockClient()
    client._builder.maybeSingle.mockResolvedValue({ data: updated, error: null })
    const db = createDb(client)

    const result = await db.fulfillRequest('1', { fulfiller_id: 'user-99', fulfiller_bay: 'C-05' })

    expect(result).toEqual(updated)
    expect(client._builder.update).toHaveBeenCalledWith({ status: 'resolved', fulfiller_id: 'user-99', fulfiller_bay: 'C-05' })
    expect(client._builder.eq).toHaveBeenCalledWith('status', 'open')
  })

  test('throws RACE_CONDITION when request was already fulfilled', async () => {
    const client = mockClient()
    client._builder.maybeSingle.mockResolvedValue({ data: null, error: null })
    const db = createDb(client)

    await expect(db.fulfillRequest('1', { fulfiller_id: 'user-99', fulfiller_bay: 'C-05' }))
      .rejects.toThrow('RACE_CONDITION')
  })
})

describe('cancelRequest', () => {
  test('cancels the request for its owner', async () => {
    const updated = { id: '1', status: 'cancelled' }
    const client = mockClient()
    client._builder.single.mockResolvedValue({ data: updated, error: null })
    const db = createDb(client)

    const result = await db.cancelRequest('1', 'user-42')

    expect(result).toEqual(updated)
    expect(client._builder.update).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(client._builder.eq).toHaveBeenCalledWith('requester_id', 'user-42')
  })

  test('throws when requester does not own the request', async () => {
    const client = mockClient()
    client._builder.single.mockResolvedValue({ data: null, error: { message: 'no rows found' } })
    const db = createDb(client)

    await expect(db.cancelRequest('1', 'user-99'))
      .rejects.toMatchObject({ message: 'no rows found' })
  })
})


describe('fetchOpenRequests', () => {
  test('returns empty array when no open requests exist', async () => {
    const client = mockClient()
    // default builder already resolves with { data: [], error: null }
    const db = createDb(client)

    const result = await db.fetchOpenRequests()

    expect(result).toEqual([])
  })

  test('returns array of open requests', async () => {
    const rows = [
      { id: '1', status: 'open', unit: 'A-01', start_datetime: '2026-05-01T08:00:00Z', end_datetime: '2026-05-01T10:00:00Z' },
      { id: '2', status: 'open', unit: 'B-02', start_datetime: '2026-05-01T09:00:00Z', end_datetime: '2026-05-01T11:00:00Z' },
    ]
    const client = mockClient()
    client._builder.order.mockResolvedValue({ data: rows, error: null })
    const db = createDb(client)

    const result = await db.fetchOpenRequests()

    expect(result).toEqual(rows)
  })
})

describe('fetchClosedRequests', () => {
  test('filters by requester_id for the given userId', async () => {
    const client = mockClient()
    client._builder.order.mockResolvedValue({ data: [], error: null })
    const db = createDb(client)

    await db.fetchClosedRequests('user-42')

    expect(client._builder.eq).toHaveBeenCalledWith('requester_id', 'user-42')
  })

  test('returns matching closed rows', async () => {
    const rows = [{ id: '1', status: 'resolved', requester_id: 'user-42' }]
    const client = mockClient()
    client._builder.order.mockResolvedValue({ data: rows, error: null })
    const db = createDb(client)

    const result = await db.fetchClosedRequests('user-42')

    expect(result).toEqual(rows)
  })

  test('does not return rows belonging to other users', async () => {
    const client = mockClient()
    client._builder.order.mockResolvedValue({ data: [], error: null })
    const db = createDb(client)

    const result = await db.fetchClosedRequests('user-99')

    expect(client._builder.eq).not.toHaveBeenCalledWith('requester_id', 'user-42')
    expect(result).toEqual([])
  })
})
