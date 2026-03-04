/**
 * Date Utility Functions
 *
 * Provides timezone-safe date parsing and formatting for the entire app.
 *
 * Problem: JavaScript's `new Date("2026-03-02")` parses date-only strings as UTC midnight.
 * In timezones behind UTC (e.g. UTC-8), this causes the displayed date to shift back one day.
 *
 * Solution: Always append "T00:00:00" when parsing date-only strings, which forces
 * JavaScript to interpret them as local midnight instead of UTC midnight.
 */

/**
 * Parse a date-only string (YYYY-MM-DD) into a Date object in local time.
 * Prevents the UTC timezone shift that causes dates to appear one day earlier
 * in negative-offset timezones.
 *
 * @param dateStr - A date string in "YYYY-MM-DD" format
 * @returns A Date object representing local midnight of the given date
 *
 * @example
 * parseLocalDate("2026-03-02") // → local 2026-03-02 00:00:00
 */
export function parseLocalDate(dateStr: string): Date {
    return new Date(dateStr + "T00:00:00");
}

/**
 * Format a Date object into a "YYYY-MM-DD" string using local time components.
 * Avoids the UTC shift that occurs with `date.toISOString().split("T")[0]`.
 *
 * @param date - A Date object
 * @returns A string in "YYYY-MM-DD" format based on the local date
 *
 * @example
 * formatLocalDate(new Date(2026, 2, 2)) // → "2026-03-02"
 */
export function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Format a YYYY-MM-DD date string for general UI display.
 * Handles timezone-safe parsing internally.
 *
 * @param dateStr - A date string in "YYYY-MM-DD" format
 * @param locale - The locale for formatting (e.g. "en", "zh-TW")
 * @returns A locale-formatted date string
 *
 * @example
 * formatDateDisplay("2026-03-02", "en")    // → "Mar 2, 2026"
 * formatDateDisplay("2026-03-02", "zh-TW") // → "2026/3/2"
 */
export function formatDateDisplay(dateStr: string, locale: string): string {
    return parseLocalDate(dateStr).toLocaleDateString(locale, {
        year: "numeric",
        month: locale === "zh-TW" ? "numeric" : "short",
        day: "numeric",
    });
}

/**
 * Format a YYYY-MM-DD date string for day-view headers.
 * Returns weekday + month/day like "Monday, Mar 2" or "星期一, 3月2日".
 *
 * @param dateStr - A date string in "YYYY-MM-DD" format
 * @param locale - The locale for formatting (e.g. "en", "zh-TW")
 * @returns A formatted string like "Monday, Mar 2"
 *
 * @example
 * formatDayHeader("2026-03-02", "en")    // → "Monday, Mar 2"
 * formatDayHeader("2026-03-02", "zh-TW") // → "星期一, 3月2日"
 */
export function formatDayHeader(dateStr: string, locale: string): string {
    const date = parseLocalDate(dateStr);
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    const monthDay = date.toLocaleDateString(locale, {
        month: locale === "zh-TW" ? "numeric" : "short",
        day: "numeric",
    });
    return `${weekday}, ${monthDay}`;
}
