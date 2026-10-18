import { toLocalIsoDate } from './date.util';

describe('toLocalIsoDate', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toLocalIsoDate(new Date(2026, 2, 1))).toBe('2026-03-01');
  });

  it('pads single-digit month and day with leading zeros', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalIsoDate(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('handles December 31st without rolling the year', () => {
    expect(toLocalIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('handles January 1st', () => {
    expect(toLocalIsoDate(new Date(2027, 0, 1))).toBe('2027-01-01');
  });

  it('does not shift local midnight to the previous day (toISOString regression)', () => {
    // A date picked at LOCAL midnight must serialize as that same local day.
    // toISOString() would convert to UTC and, in negative-UTC timezones
    // (e.g. US Eastern), report the PREVIOUS day. toLocalIsoDate must not.
    const localMidnight = new Date(2026, 5, 15, 0, 0, 0);
    expect(toLocalIsoDate(localMidnight)).toBe('2026-06-15');
  });

  it('uses the local calendar day regardless of the time of day', () => {
    expect(toLocalIsoDate(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
  });

  it('formats double-digit month and day without padding artifacts', () => {
    expect(toLocalIsoDate(new Date(2026, 9, 25))).toBe('2026-10-25');
  });
});
