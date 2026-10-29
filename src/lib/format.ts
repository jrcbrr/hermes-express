/**
 * Display formatting for dates and times. Money formatting (formatPeso) lives
 * in ./money.ts.
 */

/** 24-hour "HH:MM" -> "7:00 AM" / "10:00 PM". */
export function formatTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new RangeError(`Expected 24-hour "HH:MM", got "${time}"`);
  }
  const hours = Number(match[1]);
  const period = hours < 12 ? "AM" : "PM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${match[2]} ${period}`;
}

/** "+639171234567" -> "0917 123 4567", the way it is written on a form. Other text is returned as is. */
export function formatPhPhone(stored: string): string {
  const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(stored);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : stored;
}
