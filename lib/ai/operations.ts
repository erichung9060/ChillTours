/**
 * Itinerary Operations
 * 
 * This module provides operation-based itinerary updates.
 * Instead of replacing entire days, LLM can specify granular operations:
 * - ADD: Add new activities
 * - REMOVE: Remove activities
 * - UPDATE: Modify existing activities
 * - MOVE: Move activities between days
 * - REORDER: Change activity order within a day
 * 
 * Multiple operations can be applied in a single update.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Itinerary, Day, Activity } from '@/types';

// ============================================================================
// Operation Types
// ============================================================================

export type OperationType = 'ADD' | 'REMOVE' | 'UPDATE' | 'MOVE' | 'REORDER';

/**
 * Add new activity to a specific day
 */
export interface AddOperation {
  type: 'ADD';
  day_number: number;
  activity: {
    time: string;
    title: string;
    description?: string;
    location: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      place_id?: string;
    };
    duration_minutes?: number;
    insert_at?: number; // Optional: insert at specific position (default: append)
  };
}

/**
 * Remove activity from a day
 */
export interface RemoveOperation {
  type: 'REMOVE';
  day_number: number;
  activity_index: number; // 0-based index (0 = first activity, 1 = second, etc.)
}

/**
 * Update existing activity
 */
export interface UpdateOperation {
  type: 'UPDATE';
  day_number: number;
  activity_index: number; // 0-based index (0 = first activity, 1 = second, etc.)
  changes: {
    time?: string;
    title?: string;
    description?: string;
    location?: {
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
      place_id?: string;
    };
    duration_minutes?: number;
  };
}

/**
 * Move activity from one day to another
 */
export interface MoveOperation {
  type: 'MOVE';
  from_day_number: number;
  from_activity_index: number; // 0-based index in source day
  to_day_number: number;
  insert_at?: number; // Optional: 0-based position in target day (default: append)
}

/**
 * Reorder activities within a day
 */
export interface ReorderOperation {
  type: 'REORDER';
  day_number: number;
  activity_order: number[]; // Array of 0-based indices in desired order
}

export type Operation = 
  | AddOperation 
  | RemoveOperation 
  | UpdateOperation 
  | MoveOperation 
  | ReorderOperation;

/**
 * Operations response from LLM
 */
export interface OperationsUpdate {
  operations: Operation[];
  metadata?: {
    title?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
  };
}

// ============================================================================
// Apply Operations
// ============================================================================

/**
 * Apply a list of operations to an itinerary
 * 
 * @param itinerary - Current itinerary
 * @param operations - List of operations to apply
 * @returns Updated itinerary
 */
export function applyOperations(
  itinerary: Itinerary,
  operationsUpdate: OperationsUpdate
): Itinerary {
  // Deep clone to avoid mutating original
  let updated = JSON.parse(JSON.stringify(itinerary)) as Itinerary;

  // Apply metadata changes first
  if (operationsUpdate.metadata) {
    const { title, destination, start_date, end_date } = operationsUpdate.metadata;
    if (title) updated.title = title;
    if (destination) updated.destination = destination;
    if (start_date) updated.start_date = start_date;
    if (end_date) updated.end_date = end_date;
  }

  // Apply each operation in sequence
  for (const operation of operationsUpdate.operations) {
    updated = applyOperation(updated, operation);
  }

  // Update timestamp
  updated.updated_at = new Date().toISOString();

  return updated;
}

/**
 * Apply a single operation to an itinerary
 */
function applyOperation(itinerary: Itinerary, operation: Operation): Itinerary {
  switch (operation.type) {
    case 'ADD':
      return applyAddOperation(itinerary, operation);
    case 'REMOVE':
      return applyRemoveOperation(itinerary, operation);
    case 'UPDATE':
      return applyUpdateOperation(itinerary, operation);
    case 'MOVE':
      return applyMoveOperation(itinerary, operation);
    case 'REORDER':
      return applyReorderOperation(itinerary, operation);
    default:
      console.warn('Unknown operation type:', operation);
      return itinerary;
  }
}

// ============================================================================
// Individual Operation Handlers
// ============================================================================

/**
 * Add new activity to a day
 */
function applyAddOperation(itinerary: Itinerary, op: AddOperation): Itinerary {
  const dayIndex = itinerary.days.findIndex(d => d.day_number === op.day_number);
  
  if (dayIndex === -1) {
    console.warn(`Day ${op.day_number} not found`);
    return itinerary;
  }

  // Create new activity with generated ID
  const newActivity: Activity = {
    id: uuidv4(),
    time: op.activity.time,
    title: op.activity.title,
    description: op.activity.description || '',
    location: {
      name: op.activity.location.name,
      address: op.activity.location.address,
      lat: op.activity.location.lat,
      lng: op.activity.location.lng,
      place_id: op.activity.location.place_id,
    },
    duration_minutes: op.activity.duration_minutes || 60,
    order: 0, // Will be recalculated
  };

  const day = itinerary.days[dayIndex];
  
  // Insert at specific position or append
  if (op.activity.insert_at !== undefined) {
    day.activities.splice(op.activity.insert_at, 0, newActivity);
  } else {
    day.activities.push(newActivity);
  }

  // Recalculate order
  day.activities.forEach((activity, index) => {
    activity.order = index;
  });

  return itinerary;
}

/**
 * Remove activity from a day
 */
function applyRemoveOperation(itinerary: Itinerary, op: RemoveOperation): Itinerary {
  const dayIndex = itinerary.days.findIndex(d => d.day_number === op.day_number);
  
  if (dayIndex === -1) {
    console.warn(`Day ${op.day_number} not found`);
    return itinerary;
  }

  const day = itinerary.days[dayIndex];
  
  // Use 0-based index directly
  const activityIndex = op.activity_index;

  if (activityIndex < 0 || activityIndex >= day.activities.length) {
    console.warn(`Activity index ${op.activity_index} out of range for day ${op.day_number} (has ${day.activities.length} activities)`);
    return itinerary;
  }

  // Remove activity
  day.activities.splice(activityIndex, 1);

  // Recalculate order
  day.activities.forEach((activity, index) => {
    activity.order = index;
  });

  return itinerary;
}

/**
 * Update existing activity
 */
function applyUpdateOperation(itinerary: Itinerary, op: UpdateOperation): Itinerary {
  const dayIndex = itinerary.days.findIndex(d => d.day_number === op.day_number);
  
  if (dayIndex === -1) {
    console.warn(`Day ${op.day_number} not found`);
    return itinerary;
  }

  const day = itinerary.days[dayIndex];
  
  // Use 0-based index directly
  const activityIndex = op.activity_index;

  if (activityIndex < 0 || activityIndex >= day.activities.length) {
    console.warn(`Activity index ${op.activity_index} out of range for day ${op.day_number} (has ${day.activities.length} activities)`);
    return itinerary;
  }

  const activity = day.activities[activityIndex];

  // Apply changes
  if (op.changes.time !== undefined) activity.time = op.changes.time;
  if (op.changes.title !== undefined) activity.title = op.changes.title;
  if (op.changes.description !== undefined) activity.description = op.changes.description;
  if (op.changes.duration_minutes !== undefined) activity.duration_minutes = op.changes.duration_minutes;
  
  // Update location (partial update)
  if (op.changes.location) {
    if (op.changes.location.name !== undefined) activity.location.name = op.changes.location.name;
    if (op.changes.location.address !== undefined) activity.location.address = op.changes.location.address;
    if (op.changes.location.lat !== undefined) activity.location.lat = op.changes.location.lat;
    if (op.changes.location.lng !== undefined) activity.location.lng = op.changes.location.lng;
    if (op.changes.location.place_id !== undefined) activity.location.place_id = op.changes.location.place_id;
  }

  return itinerary;
}

/**
 * Move activity from one day to another
 */
function applyMoveOperation(itinerary: Itinerary, op: MoveOperation): Itinerary {
  const fromDayIndex = itinerary.days.findIndex(d => d.day_number === op.from_day_number);
  const toDayIndex = itinerary.days.findIndex(d => d.day_number === op.to_day_number);
  
  if (fromDayIndex === -1) {
    console.warn(`Source day ${op.from_day_number} not found`);
    return itinerary;
  }
  
  if (toDayIndex === -1) {
    console.warn(`Target day ${op.to_day_number} not found`);
    return itinerary;
  }

  const fromDay = itinerary.days[fromDayIndex];
  const toDay = itinerary.days[toDayIndex];
  
  // Use 0-based index directly
  const activityIndex = op.from_activity_index;

  if (activityIndex < 0 || activityIndex >= fromDay.activities.length) {
    console.warn(`Activity index ${op.from_activity_index} out of range for day ${op.from_day_number} (has ${fromDay.activities.length} activities)`);
    return itinerary;
  }

  // Remove from source day
  const [activity] = fromDay.activities.splice(activityIndex, 1);

  // Add to target day
  if (op.insert_at !== undefined) {
    // Use 0-based index directly
    toDay.activities.splice(op.insert_at, 0, activity);
  } else {
    toDay.activities.push(activity);
  }

  // Recalculate order for both days
  fromDay.activities.forEach((a, index) => {
    a.order = index;
  });
  
  toDay.activities.forEach((a, index) => {
    a.order = index;
  });

  return itinerary;
}

/**
 * Reorder activities within a day
 */
function applyReorderOperation(itinerary: Itinerary, op: ReorderOperation): Itinerary {
  const dayIndex = itinerary.days.findIndex(d => d.day_number === op.day_number);
  
  if (dayIndex === -1) {
    console.warn(`Day ${op.day_number} not found`);
    return itinerary;
  }

  const day = itinerary.days[dayIndex];

  // Validate indices
  if (op.activity_order.length !== day.activities.length) {
    console.warn(`Activity order length (${op.activity_order.length}) doesn't match activities count (${day.activities.length})`);
    return itinerary;
  }

  // Create reordered array based on 0-based indices
  const reordered: Activity[] = [];
  
  for (const index of op.activity_order) {
    // Use 0-based index directly
    if (index < 0 || index >= day.activities.length) {
      console.warn(`Invalid activity index ${index} in reorder operation`);
      return itinerary;
    }
    
    reordered.push(day.activities[index]);
  }

  // Update day activities
  day.activities = reordered;

  // Recalculate order
  day.activities.forEach((activity, index) => {
    activity.order = index;
  });

  return itinerary;
}

// ============================================================================
// Parse Operations from LLM Response
// ============================================================================

/**
 * Parse operations from LLM response
 * 
 * @param response - LLM response containing operations
 * @returns Parsed operations update
 */
export function parseOperations(
  response: string | Record<string, any>
): OperationsUpdate | null {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    if (!data.operations || !Array.isArray(data.operations)) {
      console.warn('No operations array found in response');
      return null;
    }

    return {
      operations: data.operations,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Failed to parse operations:', error);
    return null;
  }
}
