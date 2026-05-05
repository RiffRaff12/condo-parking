import { isStandalone, isIOS, isAndroidChrome, isIOSBelow16_4, shouldShowInstallOverlay, shouldShowPushButton, registerPush } from '../src/pwa.js'

const standaloneMedia = (matches) => (query) => ({ matches })

const UA = {
  ios15:    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  ios16_4:  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
  ios17:    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  android:  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  desktop:  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
}

describe('isStandalone', () => {
  test('returns true when display-mode is standalone', () => {
    expect(isStandalone(standaloneMedia(true))).toBe(true)
  })

  test('returns false when display-mode is browser', () => {
    expect(isStandalone(standaloneMedia(false))).toBe(false)
  })
})

describe('isIOS', () => {
  test('returns true for iOS Safari user agent', () => {
    expect(isIOS(UA.ios17)).toBe(true)
  })

  test('returns false for Android Chrome user agent', () => {
    expect(isIOS(UA.android)).toBe(false)
  })

  test('returns false for desktop Chrome user agent', () => {
    expect(isIOS(UA.desktop)).toBe(false)
  })
})

describe('isAndroidChrome', () => {
  test('returns true for Android Chrome user agent', () => {
    expect(isAndroidChrome(UA.android)).toBe(true)
  })

  test('returns false for iOS user agent', () => {
    expect(isAndroidChrome(UA.ios17)).toBe(false)
  })

  test('returns false for desktop Chrome', () => {
    expect(isAndroidChrome(UA.desktop)).toBe(false)
  })
})

describe('isIOSBelow16_4', () => {
  test('returns true for iOS 15', () => {
    expect(isIOSBelow16_4(UA.ios15)).toBe(true)
  })

  test('returns false for iOS 16.4', () => {
    expect(isIOSBelow16_4(UA.ios16_4)).toBe(false)
  })

  test('returns false for iOS 17', () => {
    expect(isIOSBelow16_4(UA.ios17)).toBe(false)
  })
})

describe('shouldShowInstallOverlay', () => {
  test('returns false when already running in standalone mode', () => {
    expect(shouldShowInstallOverlay({
      session: { user: { id: 'u1' } },
      matchMedia: standaloneMedia(true),
      userAgent: UA.ios17,
    })).toBe(false)
  })

  test('returns true when authenticated but not standalone', () => {
    expect(shouldShowInstallOverlay({
      session: { user: { id: 'u1' } },
      matchMedia: standaloneMedia(false),
      userAgent: UA.android,
    })).toBe(true)
  })

  test('returns false when no session (user not logged in)', () => {
    expect(shouldShowInstallOverlay({
      session: null,
      matchMedia: standaloneMedia(false),
      userAgent: UA.android,
    })).toBe(false)
  })
})

describe('shouldShowPushButton', () => {
  test('returns false for iOS below 16.4', () => {
    expect(shouldShowPushButton({ userAgent: UA.ios15 })).toBe(false)
  })

  test('returns true for iOS 16.4', () => {
    expect(shouldShowPushButton({ userAgent: UA.ios16_4 })).toBe(true)
  })

  test('returns true for iOS 17', () => {
    expect(shouldShowPushButton({ userAgent: UA.ios17 })).toBe(true)
  })

  test('returns true for Android', () => {
    expect(shouldShowPushButton({ userAgent: UA.android })).toBe(true)
  })

  test('returns true for desktop', () => {
    expect(shouldShowPushButton({ userAgent: UA.desktop })).toBe(true)
  })
})

describe('registerPush', () => {
  const mockSub = { endpoint: 'https://push.example.com/1', keys: { p256dh: 'k', auth: 'a' } }
  const mockRegistration = {
    pushManager: {
      subscribe: vi.fn().mockResolvedValue({ toJSON: () => mockSub }),
    },
  }
  const mockDb = { savePushSubscription: vi.fn().mockResolvedValue({}) }

  beforeEach(() => {
    mockRegistration.pushManager.subscribe.mockClear()
    mockDb.savePushSubscription.mockClear()
  })

  test('saves subscription and returns granted:true when permission granted', async () => {
    const result = await registerPush({
      requestPermission: async () => 'granted',
      registration: mockRegistration,
      vapidKey: 'vapid-key',
      db: mockDb,
      userId: 'user-1',
    })

    expect(result).toEqual({ granted: true, subscription: mockSub })
    expect(mockDb.savePushSubscription).toHaveBeenCalledWith('user-1', mockSub)
  })

  test('returns granted:false without crash when permission denied', async () => {
    const result = await registerPush({
      requestPermission: async () => 'denied',
      registration: mockRegistration,
      vapidKey: 'vapid-key',
      db: mockDb,
      userId: 'user-1',
    })

    expect(result).toEqual({ granted: false })
    expect(mockDb.savePushSubscription).not.toHaveBeenCalled()
  })
})
