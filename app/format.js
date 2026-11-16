// Small helpers for showing API values safely and readably.

/** Text made safe to put inside HTML: every API string goes through this (or textContent). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1325.00' or 0.5) as '$1,325' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A count with thousands separators: 10102 -> '10,102'. */
export function count(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

/** A byte count as '1.5 MB' / '640 KB' / '900 B'. */
export function bytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '0 B';
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** An ISO timestamp as a UTC date and time: 'Dec 14, 2026, 10:00 AM UTC'. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** An ISO timestamp as a short UTC date: 'Nov 14, 2026'. */
export function day(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Whether a deadline is still ahead: a bounty takes entries by its deadline, not its status. */
export function isOpen(deadline) {
  return new Date(deadline).getTime() > Date.now();
}

/** The time until a deadline, ticking form: '27d 04:12:09', '04:12:09', '12:09', or 'ended'. */
export function countdown(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'ended';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const rest = totalSeconds % 86400;
  const hh = String(Math.floor(rest / 3600)).padStart(2, '0');
  const mm = String(Math.floor((rest % 3600) / 60)).padStart(2, '0');
  const ss = String(rest % 60).padStart(2, '0');
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** The time until a deadline, prose form: '27 days left', '3h 12m left', or 'entries closed'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'entries closed';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 1) return `${days} days left`;
  if (days === 1) return `1 day ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return 'under a minute left';
}

/** A clock time for the "updated" note: '12:03:45'. */
export function clock(when) {
  return when.toLocaleTimeString('en-GB', { hour12: false });
}

/** A leaderboard cell: micro win rates and their intervals as percents, micro dollars
 *  as money, byte counts as sizes, the valid flag as a word, else the API's own text. */
export function cellText(column, entry) {
  const shown = entry?.display?.[column.key];
  const raw = entry?.values?.[column.key];
  const source = typeof column.source === 'string' ? column.source : '';
  if (column.key === 'bytes' && raw != null) return bytes(raw);
  if (column.key === 'valid' && raw != null) return Number(raw) === 1 ? 'valid' : '—';
  if (raw != null && (source.includes('win_rate') || source.includes('interval'))) {
    return `${(Number(raw) / 10000).toFixed(2)}%`;
  }
  if (raw != null && source.includes('micro_usd')) return money(Number(raw) / 1000000);
  if (shown != null && shown !== '') return String(shown);
  return raw == null ? '—' : String(raw);
}
