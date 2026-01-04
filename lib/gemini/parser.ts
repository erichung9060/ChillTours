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
  userId: string
): Itinerary {
  try {
    // Parse JSON if string
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    // Calculate dates if not provided
    const today = new Date();
    
    // Try to extract start_date from first day, or use today
    const startDate = data.start_date || 
                     (data.days?.[0]?.date) || 
                     today.toISOString().split('T')[0];
    
    // Try to extract end_date from last day, or calculate based on duration
    const duration = data.duration || data.days?.length || 1;
    const endDate = data.end_date || 
                   (data.days?.[data.days.length - 1]?.date) ||
                   (() => {
                     const end = new Date(startDate);
                     end.setDate(end.getDate() + duration - 1);
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
      days: parseDays(data.days || [], startDate),
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
    // Calculate date for this day if not provided
    const dayDate = day.date || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return date.toISOString().split('T')[0];
    })();

    return {
      day_number: day.day_number || index + 1,
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
    address: location.address,
    lat: location.lat,
    lng: location.lng,
    place_id: location.place_id,
  };
}

/**
 * Parse partial itinerary update from AI response
 * 
 * Used for chat-based itinerary modifications
 * 
 * @param response - AI response containing updates
 * @returns Partial itinerary with updates
 */
export function parseItineraryUpdate(
  response: string | Record<string, any>
): Partial<Itinerary> {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    const update: Partial<Itinerary> = {};

    if (data.title) update.title = data.title;
    if (data.destination) update.destination = data.destination;
    if (data.start_date) update.start_date = data.start_date;
    if (data.end_date) update.end_date = data.end_date;
    if (data.days) {
      // Use start_date if available, otherwise use today
      const startDate = data.start_date || new Date().toISOString().split('T')[0];
      update.days = parseDays(data.days, startDate);
    }

    return update;
  } catch (error) {
    console.error('Failed to parse itinerary update:', error);
    return {};
  }
}

/**
 * Detect if AI response contains itinerary modification intent
 * 
 * @param message - AI message content
 * @returns True if message contains modification intent
 */
export function detectItineraryModification(message: string): boolean {
  const modificationKeywords = [
    'updated',
    'modified',
    'changed',
    'added',
    'removed',
    'replaced',
    'moved',
    'rescheduled',
    'adjusted',
  ];

  const lowerMessage = message.toLowerCase();
  return modificationKeywords.some((keyword) => lowerMessage.includes(keyword));
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
