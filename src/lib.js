/* ── Helpers ──────────────────────────────────────────── */
export function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function sanitize(str, maxLen = 100) {
  return String(str).trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '').slice(0, maxLen);
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

export const DAYS_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const DAYS_EN     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const MONTHS_EN   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtEN(iso) {
  const d = new Date(iso);
  const h24 = d.getHours();
  const h = (h24 === 0 || h24 === 12) ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return `${DAYS_EN[d.getDay()]}, ${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}, ${h}:00 ${ampm}`;
}

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

export function fmtSlotEN(iso) {
  const d = new Date(iso);
  const h24 = d.getHours();
  const h = (h24 === 0 || h24 === 12) ? 12 : h24 % 12;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  return {
    dow:  DAYS_SHORT[d.getDay()],
    date: `${d.getDate()} ${MONTHS_EN[d.getMonth()]}`,
    time: `${h}:00 ${ampm}`,
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
    return { ok: false, error: 'Sila isi semua ruangan sebelum menghantar.', errorKey: 'val_fill_all' };
  const fromISO = `${fromDate}T${fromTime}:00`;
  const toISO   = `${toDate}T${toTime}:00`;
  if (new Date(toISO) <= new Date(fromISO))
    return { ok: false, error: 'Masa tamat mesti selepas masa mula.', errorKey: 'val_end_after_start' };
  const limitMs = 3 * 24 * 60 * 60 * 1000;
  if (new Date(fromISO) - Date.now() > limitMs)
    return { ok: false, error: 'Permintaan hanya boleh dibuat 3 hari ke hadapan.', errorKey: 'val_max_3_days' };
  return { ok: true, fromISO, toISO };
}

export function buildWhatsAppLink(phone) {
  return `https://wa.me/${waPhone(phone)}`
}

export function buildWhatsAppFulfilLink(requesterPhone, fulfillerBay, startIso, endIso, lang = 'ms') {
  if (!requesterPhone) return null
  const fmt = lang === 'en' ? fmtEN : fmtMalay
  const msg = lang === 'en'
    ? `Hi neighbour! 👋\n\nI can offer my parking bay:\n🅿️ Bay: ${fulfillerBay}\n📅 From: ${fmt(startIso)}\n⏰ Until: ${fmt(endIso)}\n\nCan I help?`
    : `Salam jiran! 👋\n\nSaya boleh tawarkan petak parking saya:\n🅿️ Petak: ${fulfillerBay}\n📅 Dari: ${fmt(startIso)}\n⏰ Hingga: ${fmt(endIso)}\n\nBoleh saya bantu?`
  return `https://wa.me/${waPhone(requesterPhone)}?text=${encodeURIComponent(msg)}`
}

export function resolveDeepLink(search, openRequestIds) {
  const id = new URLSearchParams(search).get('r')
  if (!id) return { action: 'none' }
  if (openRequestIds.includes(id)) return { action: 'highlight', id }
  return { action: 'toast' }
}

export function buildShareLink(requestId) {
  return `https://parkitjiran.netlify.app/?r=${requestId}`
}

export function buildShareMessage({ id, requester_name, start_datetime, end_datetime }, lang = 'ms') {
  const link = buildShareLink(id)
  const fmt = lang === 'en' ? fmtEN : fmtMalay
  return lang === 'en'
    ? `Hi everyone! 👋 I'm ${requester_name}, looking for parking:\n📅 From: ${fmt(start_datetime)}\n⏰ Until: ${fmt(end_datetime)}\n\nAnyone can help? 🙏\nClick to help: ${link}`
    : `Hai semua! 👋 Saya ${requester_name}, perlukan tempat parking:\n📅 Dari: ${fmt(start_datetime)}\n⏰ Hingga: ${fmt(end_datetime)}\n\nAda yang boleh bantu? 🙏\nKlik untuk bantu: ${link}`
}

export function normalisePhone(input) {
  const digits = String(input).replace(/\D/g, '').replace(/^60/, '0')
  if (!/^01\d{8,9}$/.test(digits)) throw { code: 'INVALID_PHONE' }
  return digits
}

export function normaliseUnit(input) {
  const s = String(input).trim().toUpperCase()
  const m = s.match(/^([12])[\s\-]+(LG|G|1[0-5]|0?[1-9])[\s\-]+(\d{1,2})$/)
  if (!m) throw { code: 'INVALID_UNIT' }
  const floor = /^\d+$/.test(m[2]) ? m[2].padStart(2, '0') : m[2]
  const unit  = m[3].padStart(2, '0')
  return `${m[1]}-${floor}-${unit}`
}

export function normaliseBay(input) {
  const s = String(input).trim().toUpperCase()
  const m = s.match(/^(LG|L1|G)[\s\-]?(\d{1,3})$/)
  if (!m) throw { code: 'INVALID_BAY' }
  return `${m[1]}-${m[2].padStart(3, '0')}`
}


