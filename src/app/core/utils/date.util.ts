/**
 * Formats a Date as YYYY-MM-DD using the LOCAL calendar date.
 *
 * Never use `toISOString().split('T')[0]` for this: toISOString converts to
 * UTC, so in negative-UTC timezones (e.g. US Eastern) a date picked at local
 * midnight serializes as the PREVIOUS day.
 */
export function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
