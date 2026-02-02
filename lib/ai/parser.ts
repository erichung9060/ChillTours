/**
 * Itinerary Parser
 * 
 * This module provides parsing utilities for converting AI-generated
 * responses into structured Itinerary objects.
 * 
 * Requirements: 3.4, 3.5
 */

import { v4 as uuidv4 } from 'uuid';
import type { Itinerary, Day, Activity, Location } from '@/types';
import { ItinerarySchema } from '@/types';

/**
 * Parse AI response into structured Itinerary
 * 
 * @param response - AI-generated response (JSON string or object)
 * @param userId - User ID to associate with itinerary
 * @returns Parsed and validated Itinerary
 * @throws Error if parsing or validation fails
 */
export function parseItinerary(
  response: string | Record<string, any>,
  userId: string,
  contextStartDate?: string
): Itinerary {
  try {
    // Parse JSON if string
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    // Use contextStartDate if provided, otherwise fallback to today
    const startDate = contextStartDate || 
                     data.start_date || 
                     (data.days?.[0]?.date) || 
                     new Date().toISOString().split('T')[0];
    
    // Calculate end_date based on days array length
    const daysArray = data.days || [];
    const duration = daysArray.length || 1;
    const endDate = data.end_date || (() => {
      const end = new Date(startDate);
      end.setDate(end.getDate() + Math.max(0, duration - 1));
      return end.toISOString().split('T')[0];
    })();

    // Build itinerary with required fields
    const itinerary: Itinerary = {
      id: data.id || uuidv4(),
      user_id: userId,
      title: data.title || data.destination || 'Untitled Trip',
      destination: data.destination,
      start_date: startDate,
      end_date: endDate,
      days: parseDays(daysArray, startDate),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      shared_with: data.shared_with || [],
    };

    // Validate against schema
    const validated = ItinerarySchema.parse(itinerary);
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse itinerary: ${error.message}`);
    }
    throw new Error('Failed to parse itinerary: Unknown error');
  }
}

/**
 * Parse days array
 * 
 * @param days - Raw days data
 * @param startDate - Start date in YYYY-MM-DD format
 * @returns Parsed Day array
 */
function parseDays(days: any[], startDate: string): Day[] {
  return days.map((day, index) => {
    // Use day_number to calculate date relative to startDate
    // day_number 1 -> index 0 -> startDate
    const dayNum = day.day_number || index + 1;
    
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayNum - 1));
    const dayDate = date.toISOString().split('T')[0];

    return {
      day_number: dayNum,
      date: dayDate,
      activities: parseActivities(day.activities || []),
    };
  });
}

/**
 * Parse activities array
 * 
 * @param activities - Raw activities data
 * @returns Parsed Activity array
 */
function parseActivities(activities: any[]): Activity[] {
  return activities.map((activity, index) => ({
    id: activity.id || uuidv4(),
    time: activity.time,
    title: activity.title,
    description: activity.description || '',
    location: parseLocation(activity.location),
    duration_minutes: activity.duration_minutes || 60,
    order: activity.order !== undefined ? activity.order : index,
  }));
}

/**
 * Parse location object
 * 
 * @param location - Raw location data
 * @returns Parsed Location
 */
function parseLocation(location: any): Location {
  return {
    name: location.name,
    lat: location.lat,
    lng: location.lng,
    place_id: location.place_id,
  };
}

/**
 * Extract JSON from AI response that may contain text
 * 
 * @param response - AI response potentially containing JSON
 * @returns Extracted JSON string or null
 */
export function extractJSON(response: string): string | null {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}
