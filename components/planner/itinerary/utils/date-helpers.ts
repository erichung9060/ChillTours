/**
 * Date Helper Functions
 *
 * Utility functions for date calculations in the itinerary system.
 * All functions use UTC to avoid timezone issues.
 */

/**
 * Calculate the date for a specific day number in an itinerary
 *
 * @param startDate - The itinerary start date in YYYY-MM-DD format
 * @param dayNumber - The day number (1-based)
 * @returns The date for the specified day in YYYY-MM-DD format
 *
 * @example
 * calculateDayDate("2024-03-15", 1) // "2024-03-15"
 * calculateDayDate("2024-03-15", 2) // "2024-03-16"
 * calculateDayDate("2024-03-15", 3) // "2024-03-17"
 */
export function calculateDayDate(startDate: string, dayNumber: number): string {
  // Parse date components
  const [year, month, day] = startDate.split("-").map(Number);
  
  // Create date object in UTC to avoid timezone issues
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  
  // Add offset (dayNumber is 1-based, so subtract 1)
  dateObj.setUTCDate(dateObj.getUTCDate() + (dayNumber - 1));
  
  // Return in YYYY-MM-DD format
  return dateObj.toISOString().split("T")[0];
}
