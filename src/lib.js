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

/* ── Validation helpers ───────────────────────────────── */
export function validateRequestForm({ name, unit, phone, fromDate, fromTime, toDate, toTime }) {
  if (!name || !unit || !phone || !fromDate || !fromTime || !toDate || !toTime)
    return { ok: false, error: 'Sila isi semua ruangan sebelum menghantar.' };
  const fromISO = `${fromDate}T${fromTime}:00`;
  const toISO   = `${toDate}T${toTime}:00`;
  if (new Date(toISO) <= new Date(fromISO))
    return { ok: false, error: 'Masa tamat mesti selepas masa mula.' };
  return { ok: true, fromISO, toISO };
}

export function validateFulfilForm({ fName, fUnit, fPhone, fBay }) {
  if (!fName || !fUnit || !fPhone || !fBay)
    return { ok: false, error: 'Sila isi semua ruangan.' };
  return { ok: true };
}
