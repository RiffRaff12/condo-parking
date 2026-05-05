export function isStandalone(matchMedia = window.matchMedia) {
  return matchMedia('(display-mode: standalone)').matches
}

export function isIOS(userAgent = navigator.userAgent) {
  return /iP(hone|ad|od)/.test(userAgent)
}

export function isIOSBelow16_4(userAgent = navigator.userAgent) {
  const m = userAgent.match(/CPU iPhone OS (\d+)_(\d+)/)
  if (!m) return false
  const major = parseInt(m[1], 10)
  const minor = parseInt(m[2], 10)
  return major < 16 || (major === 16 && minor < 4)
}

export function shouldShowInstallOverlay({ session, matchMedia = window.matchMedia, userAgent = navigator.userAgent }) {
  if (!session) return false
  if (isStandalone(matchMedia)) return false
  return true
}

export function shouldShowPushButton({ userAgent = navigator.userAgent } = {}) {
  return !isIOSBelow16_4(userAgent)
}

export async function registerPush({ requestPermission, registration, vapidKey, db, userId }) {
  const permission = await requestPermission()
  if (permission !== 'granted') return { granted: false }
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKey,
  })
  const subJson = sub.toJSON()
  await db.savePushSubscription(userId, subJson)
  return { granted: true, subscription: subJson }
}
