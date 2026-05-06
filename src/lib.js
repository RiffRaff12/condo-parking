/* ── Helpers ──────────────────────────────────────────── */
export function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
export function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function sanitize(str, maxLen = 100) {
  return String(str).trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '').slice(0, maxLen);
}
export function loadRequests() {
  try { return JSON.parse(localStorage.getItem('parkitjiran_v2') || '[]'); } catch { return []; }
}
export function saveRequests(list) {
  localStorage.setItem('parkitjiran_v2', JSON.stringify(list));
}
export function waPhone(phone) {
  return phone.replace(/\D/g,'').replace(/^0/,'60');
}

/* ── Malay date/time ──────────────────────────────────── */
export const DAYS   = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];
export const MONTHS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];

export function fmtMalay(iso) {
  const d = new Date(iso);
  const h24 = d.getHours();
  let period, h;
  if (h24 === 0)       { h = 12; period = 'tgh. malam'; }
  else if (h24 < 12)   { h = h24; period = 'pagi'; }
  else if (h24 === 12) { h = 12; period = 'tgh. hari'; }
  else                 { h = h24 - 12; period = 'petang'; }
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:00 ${period}`;
}

export const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function fmtSlot(iso) {
  const d = new Date(iso);
  const h24 = d.getHours();
  let period, h;
  if (h24 === 0)       { h = 12; period = 'mlm'; }
  else if (h24 < 12)   { h = h24; period = 'pgi'; }
  else if (h24 === 12) { h = 12;  period = 'tgh'; }
  else                 { h = h24 - 12; period = 'ptg'; }
  return {
    dow:  DAYS_SHORT[d.getDay()],
    date: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    time: `${h}:00${period}`,
  };
}

/* ── To-datetime defaults ─────────────────────────────── */
export function computeToDefaults(fromDate, fromTime) {
  if (fromTime < '22:00') {
    return { toDate: fromDate, toTime: '22:00' }
  }
  const d = new Date(`${fromDate}T${fromTime}:00`)
  d.setDate(d.getDate() + 1)
  const pad = n => String(n).padStart(2, '0')
  const nextDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  return { toDate: nextDate, toTime: '08:00' }
}

/* ── Validation helpers ───────────────────────────────── */
export function validateRequestForm({ fromDate, fromTime, toDate, toTime }) {
  if (!fromDate || !fromTime || !toDate || !toTime)
    return { ok: false, error: 'Sila isi semua ruangan sebelum menghantar.' };
  const fromISO = `${fromDate}T${fromTime}:00`;
  const toISO   = `${toDate}T${toTime}:00`;
  if (new Date(toISO) <= new Date(fromISO))
    return { ok: false, error: 'Masa tamat mesti selepas masa mula.' };
  const limitMs = 3 * 24 * 60 * 60 * 1000;
  if (new Date(fromISO) - Date.now() > limitMs)
    return { ok: false, error: 'Permintaan hanya boleh dibuat 3 hari ke hadapan.' };
  return { ok: true, fromISO, toISO };
}

export function buildFulfillmentMessage(bay) {
  return `Permintaan anda telah dipenuhi! Jiran anda menawarkan petak ${bay}.`
}

export function shouldShowCancelButton(request, userId) {
  return request.requester_id === userId && request.status !== 'cancelled'
}

export function buildRevocationMessage(bay) {
  return `Alert: Jiran anda terpaksa menarik balik tawaran Petak ${bay}. Permintaan anda telah diletakkan semula di papan!`
}

export function shouldShowRevokeButton(request, userId) {
  return request.fulfiller_id === userId && request.status === 'resolved'
}

export function buildExpiryMessage() {
  return 'Heads up: Tiada jiran yang dapat membantu permintaan anda. Ia telah dibuang. Sila buat peraturan lain.'
}

export function buildDailyDigestMessage(count) {
  return `Terdapat ${count} jiran yang memerlukan parking dalam beberapa hari ini. Ketik untuk membantu!`
}

export function buildCommitmentPingMessage(bay) {
  return `Peringatan: Anda telah menawarkan Petak ${bay} hari ini. Sila pastikan ia kosong!`
}

export function buildWhatsAppLink(phone) {
  return `https://wa.me/${waPhone(phone)}`
}

export function buildWhatsAppFulfilLink(requesterPhone, fulfillerBay, startIso, endIso) {
  if (!requesterPhone) return null
  const msg = `Salam! Saya boleh tawarkan Petak ${fulfillerBay} untuk slot dari ${fmtMalay(startIso)} hingga ${fmtMalay(endIso)}. Boleh saya bantu?`
  return `https://wa.me/${waPhone(requesterPhone)}?text=${encodeURIComponent(msg)}`
}

export function buildParkingPass({ fulfiller_bay, start_datetime, end_datetime, fulfiller_phone, requester_phone }) {
  return {
    bay:              fulfiller_bay,
    startFormatted:   fmtMalay(start_datetime),
    endFormatted:     fmtMalay(end_datetime),
    fulfillerWaLink:  buildWhatsAppLink(fulfiller_phone),
    requesterWaLink:  buildWhatsAppLink(requester_phone),
  }
}

export function validateOnboardingForm({ phone, unit, bay }) {
  if (!phone || !unit || !bay)
    return { ok: false, error: 'Sila isi nombor telefon, unit, dan petak parkir anda.' };
  return { ok: true };
}

export function validateFulfilForm({ fName, fUnit, fPhone, fBay }) {
  if (!fName || !fUnit || !fPhone || !fBay)
    return { ok: false, error: 'Sila isi semua ruangan.' };
  return { ok: true };
}
