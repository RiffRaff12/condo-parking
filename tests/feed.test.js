import { createFeed } from '../src/feed.js'

const req = (id, status = 'open', extra = {}) => ({
  id, status, unit: 'A-01', name: 'Ali', phone: '60123456789',
  start_datetime: '2026-05-01T08:00:00Z', end_datetime: '2026-05-01T10:00:00Z',
  created_at: '2026-05-01T07:00:00Z', ...extra,
})

const mockDb = (requests = []) => ({
  fetchOpenRequests: vi.fn().mockResolvedValue(requests),
})

const insert = (row) => ({ eventType: 'INSERT', new: row, old: {} })
const update = (oldRow, newRow) => ({ eventType: 'UPDATE', new: newRow, old: oldRow })
const del    = (row) => ({ eventType: 'DELETE', new: {}, old: row })

describe('subscribe', () => {
  test('callback is fired after load with current requests', async () => {
    const rows = [req('1')]
    const feed = createFeed(mockDb(rows))
    const cb = vi.fn()
    feed.subscribe(cb)

    await feed.load()

    expect(cb).toHaveBeenCalledWith(rows)
  })
})

describe('subscribe notifies on handleEvent', () => {
  test('callback fired with updated list after INSERT', async () => {
    const feed = createFeed(mockDb([]))
    await feed.load()
    const cb = vi.fn()
    feed.subscribe(cb)

    feed.handleEvent(insert(req('1')))

    expect(cb).toHaveBeenCalledWith([req('1')])
  })

  test('callback fired with updated list after DELETE', async () => {
    const feed = createFeed(mockDb([req('1'), req('2')]))
    await feed.load()
    const cb = vi.fn()
    feed.subscribe(cb)

    feed.handleEvent(del(req('1')))

    expect(cb).toHaveBeenCalledWith([req('2')])
  })
})

describe('handleEvent', () => {
  test('DELETE removes card from feed', async () => {
    const feed = createFeed(mockDb([req('1'), req('2')]))
    await feed.load()

    feed.handleEvent(del(req('1')))

    expect(feed.getRequests().map(r => r.id)).toEqual(['2'])
  })

  test('UPDATE open→open updates card in place', async () => {
    const feed = createFeed(mockDb([req('1')]))
    await feed.load()
    const updated = req('1', 'open', { fulfiller_bay: 'C-05' })

    feed.handleEvent(update(req('1'), updated))

    expect(feed.getRequests()).toEqual([updated])
  })

  test('UPDATE open→resolved removes card from feed', async () => {
    const feed = createFeed(mockDb([req('1'), req('2')]))
    await feed.load()

    feed.handleEvent(update(req('1'), req('1', 'resolved')))

    expect(feed.getRequests().map(r => r.id)).toEqual(['2'])
  })

  test('UPDATE open→expired removes card from feed', async () => {
    const feed = createFeed(mockDb([req('1'), req('2')]))
    await feed.load()

    feed.handleEvent(update(req('1'), req('1', 'expired')))

    expect(feed.getRequests().map(r => r.id)).toEqual(['2'])
  })

  test('UPDATE resolved→open re-adds card to feed', async () => {
    const feed = createFeed(mockDb([req('2')]))
    await feed.load()

    feed.handleEvent(update(req('1', 'resolved'), req('1', 'open')))

    expect(feed.getRequests().map(r => r.id)).toContain('1')
  })

  test('INSERT open request adds it to the feed', async () => {
    const feed = createFeed(mockDb([]))
    await feed.load()

    feed.handleEvent(insert(req('1')))

    expect(feed.getRequests()).toEqual([req('1')])
  })
})

describe('load', () => {
  test('populates feed with open requests from db', async () => {
    const rows = [req('1'), req('2')]
    const feed = createFeed(mockDb(rows))

    await feed.load()

    expect(feed.getRequests()).toEqual(rows)
  })

  test('feed is empty when db has no open requests', async () => {
    const feed = createFeed(mockDb([]))

    await feed.load()

    expect(feed.getRequests()).toEqual([])
  })
})
