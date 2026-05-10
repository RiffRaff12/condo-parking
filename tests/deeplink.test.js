import { resolveDeepLink } from '../src/lib.js'

describe('resolveDeepLink', () => {
  test('returns highlight action when request ID is in open list', () => {
    const result = resolveDeepLink('?r=abc-123', ['abc-123', 'def-456'])
    expect(result).toEqual({ action: 'highlight', id: 'abc-123' })
  })

  test('returns toast action when request ID is not in open list', () => {
    const result = resolveDeepLink('?r=gone-999', ['abc-123'])
    expect(result).toEqual({ action: 'toast' })
  })

  test('returns none action when no ?r= param present', () => {
    const result = resolveDeepLink('', ['abc-123'])
    expect(result).toEqual({ action: 'none' })
  })
})
