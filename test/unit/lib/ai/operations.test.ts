/**
 * Operations Tests
 * 
 * Test the operations-based itinerary update system
 */

import { describe, it, expect } from 'vitest';
import { applyOperations, parseOperations } from '@/lib/ai/operations';
import type { Itinerary } from '@/types';

// Mock itinerary for testing
const mockItinerary: Itinerary = {
  id: 'test-itinerary',
  user_id: 'test-user',
  title: 'Tokyo Adventure',
  destination: 'Tokyo, Japan',
  start_date: '2026-03-01',
  end_date: '2026-03-03',
  days: [
    {
      day_number: 1,
      date: '2026-03-01',
      activities: [
        {
          id: 'activity-1',
          time: '09:00',
          title: 'Activity 1',
          description: 'First activity',
          location: {
            name: 'Location 1',
            lat: 35.6762,
            lng: 139.6503,
          },
          duration_minutes: 60,
          order: 0,
        },
        {
          id: 'activity-2',
          time: '11:00',
          title: 'Activity 2',
          description: 'Second activity',
          location: {
            name: 'Location 2',
            lat: 35.6812,
            lng: 139.7671,
          },
          duration_minutes: 90,
          order: 1,
        },
      ],
    },
    {
      day_number: 2,
      date: '2026-03-02',
      activities: [
        {
          id: 'activity-3',
          time: '10:00',
          title: 'Activity 3',
          description: 'Third activity',
          location: {
            name: 'Location 3',
            lat: 35.6595,
            lng: 139.7004,
          },
          duration_minutes: 120,
          order: 0,
        },
      ],
    },
    {
      day_number: 3,
      date: '2026-03-03',
      activities: [],
    },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  shared_with: [],
};

describe('Operations System', () => {
  describe('ADD Operation', () => {
    it('should add activity to a day', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'ADD',
            day_number: 1,
            activity: {
              time: '14:00',
              title: 'New Activity',
              description: 'Added activity',
              location: {
                name: 'New Location',
                lat: 35.6586,
                lng: 139.7454,
              },
              duration_minutes: 60,
            },
          },
        ],
      });

      expect(result.days[0].activities).toHaveLength(3);
      expect(result.days[0].activities[2].title).toBe('New Activity');
      expect(result.days[0].activities[2].id).toBeDefined();
      expect(result.days[0].activities[2].order).toBe(2);
    });

    it('should insert activity at specific position', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'ADD',
            day_number: 1,
            activity: {
              time: '10:00',
              title: 'Inserted Activity',
              location: {
                name: 'Location',
                lat: 35.0,
                lng: 139.0,
              },
              insert_at: 1, // Insert at index 1 (0-based, becomes second activity)
            },
          },
        ],
      });

      expect(result.days[0].activities).toHaveLength(3);
      expect(result.days[0].activities[1].title).toBe('Inserted Activity');
      expect(result.days[0].activities[1].order).toBe(1);
      expect(result.days[0].activities[2].order).toBe(2);
    });

    it('should add activity to empty day', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'ADD',
            day_number: 3,
            activity: {
              time: '09:00',
              title: 'First Activity on Day 3',
              location: {
                name: 'Location',
                lat: 35.0,
                lng: 139.0,
              },
            },
          },
        ],
      });

      expect(result.days[2].activities).toHaveLength(1);
      expect(result.days[2].activities[0].title).toBe('First Activity on Day 3');
    });
  });

  describe('REMOVE Operation', () => {
    it('should remove activity from a day', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'REMOVE',
            day_number: 1,
            activity_index: 0, // Remove first activity (0-based)
          },
        ],
      });

      expect(result.days[0].activities).toHaveLength(1);
      expect(result.days[0].activities[0].id).toBe('activity-2');
      expect(result.days[0].activities[0].order).toBe(0);
    });

    it('should handle removing with invalid index', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'REMOVE',
            day_number: 1,
            activity_index: 999, // Invalid index
          },
        ],
      });

      // Should not crash, original activities remain
      expect(result.days[0].activities).toHaveLength(2);
    });
  });

  describe('UPDATE Operation', () => {
    it('should update activity fields', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'UPDATE',
            day_number: 1,
            activity_index: 0, // First activity (0-based)
            changes: {
              time: '10:00',
              title: 'Updated Title',
              description: 'Updated description',
            },
          },
        ],
      });

      const updated = result.days[0].activities[0];
      expect(updated.time).toBe('10:00');
      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Updated description');
      // Other fields should remain unchanged
      expect(updated.location.name).toBe('Location 1');
    });

    it('should partially update location', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'UPDATE',
            day_number: 1,
            activity_index: 0, // First activity (0-based)
            changes: {
              location: {
                name: 'Updated Location',
                lat: 36.0,
              },
            },
          },
        ],
      });

      const updated = result.days[0].activities[0];
      expect(updated.location.name).toBe('Updated Location');
      expect(updated.location.lat).toBe(36.0);
      // Other location fields should remain unchanged
      expect(updated.location.lng).toBe(139.6503);
    });
  });

  describe('MOVE Operation', () => {
    it('should move activity between days', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'MOVE',
            from_day_number: 1,
            from_activity_index: 0, // First activity (0-based)
            to_day_number: 2,
          },
        ],
      });

      // Activity removed from day 1
      expect(result.days[0].activities).toHaveLength(1);
      expect(result.days[0].activities[0].id).toBe('activity-2');

      // Activity added to day 2
      expect(result.days[1].activities).toHaveLength(2);
      expect(result.days[1].activities[1].id).toBe('activity-1');

      // Orders recalculated
      expect(result.days[0].activities[0].order).toBe(0);
      expect(result.days[1].activities[0].order).toBe(0);
      expect(result.days[1].activities[1].order).toBe(1);
    });

    it('should move activity to specific position', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'MOVE',
            from_day_number: 2,
            from_activity_index: 0, // First activity of day 2 (0-based)
            to_day_number: 1,
            insert_at: 1, // Insert as second activity (0-based)
          },
        ],
      });

      expect(result.days[0].activities).toHaveLength(3);
      expect(result.days[0].activities[1].id).toBe('activity-3');
      expect(result.days[1].activities).toHaveLength(0);
    });
  });

  describe('REORDER Operation', () => {
    it('should reorder activities within a day', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'REORDER',
            day_number: 1,
            activity_order: [1, 0], // Swap first and second (0-based indices)
          },
        ],
      });

      expect(result.days[0].activities[0].id).toBe('activity-2');
      expect(result.days[0].activities[1].id).toBe('activity-1');
      expect(result.days[0].activities[0].order).toBe(0);
      expect(result.days[0].activities[1].order).toBe(1);
    });
  });

  describe('Multiple Operations', () => {
    it('should apply multiple operations in sequence', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'REMOVE',
            day_number: 1,
            activity_index: 0, // Remove first activity (0-based)
          },
          {
            type: 'ADD',
            day_number: 2,
            activity: {
              time: '15:00',
              title: 'New Activity',
              location: {
                name: 'Location',
                lat: 35.0,
                lng: 139.0,
              },
            },
          },
          {
            type: 'UPDATE',
            day_number: 1,
            activity_index: 0, // Now the first activity (was second before removal, 0-based)
            changes: {
              title: 'Updated Activity 2',
            },
          },
        ],
      });

      // Activity 1 removed from day 1
      expect(result.days[0].activities).toHaveLength(1);
      expect(result.days[0].activities[0].id).toBe('activity-2');

      // Activity 2 updated
      expect(result.days[0].activities[0].title).toBe('Updated Activity 2');

      // New activity added to day 2
      expect(result.days[1].activities).toHaveLength(2);
      expect(result.days[1].activities[1].title).toBe('New Activity');
    });

    it('should handle move and update combination', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'MOVE',
            from_day_number: 1,
            from_activity_index: 0, // First activity (0-based)
            to_day_number: 3,
          },
          {
            type: 'UPDATE',
            day_number: 3,
            activity_index: 0, // Now first activity in day 3 (0-based)
            changes: {
              time: '14:00',
              title: 'Moved and Updated',
            },
          },
        ],
      });

      expect(result.days[2].activities).toHaveLength(1);
      expect(result.days[2].activities[0].id).toBe('activity-1');
      expect(result.days[2].activities[0].time).toBe('14:00');
      expect(result.days[2].activities[0].title).toBe('Moved and Updated');
    });
  });

  describe('Metadata Updates', () => {
    it('should update metadata fields', () => {
      const result = applyOperations(mockItinerary, {
        operations: [],
        metadata: {
          title: 'Updated Trip Title',
          end_date: '2026-03-05',
        },
      });

      expect(result.title).toBe('Updated Trip Title');
      expect(result.end_date).toBe('2026-03-05');
      expect(result.destination).toBe('Tokyo, Japan'); // Unchanged
    });
  });

  describe('parseOperations', () => {
    it('should parse operations from JSON string', () => {
      const json = JSON.stringify({
        operations: [
          {
            type: 'ADD',
            day_number: 1,
            activity: {
              time: '14:00',
              title: 'Test',
              location: {
                name: 'Test Location',
                lat: 35.0,
                lng: 139.0,
              },
            },
          },
        ],
      });

      const result = parseOperations(json);
      expect(result).not.toBeNull();
      expect(result?.operations).toHaveLength(1);
      expect(result?.operations[0].type).toBe('ADD');
    });

    it('should parse operations from object', () => {
      const obj = {
        operations: [
          {
            type: 'REMOVE',
            day_number: 1,
            activity_index: 1,
          },
        ],
        metadata: {
          title: 'New Title',
        },
      };

      const result = parseOperations(obj);
      expect(result).not.toBeNull();
      expect(result?.operations).toHaveLength(1);
      expect(result?.metadata?.title).toBe('New Title');
    });

    it('should return null for invalid input', () => {
      const result = parseOperations('invalid json');
      expect(result).toBeNull();
    });

    it('should return null for missing operations array', () => {
      const result = parseOperations(JSON.stringify({ metadata: { title: 'Test' } }));
      expect(result).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate original itinerary', () => {
      const original = JSON.parse(JSON.stringify(mockItinerary));

      applyOperations(mockItinerary, {
        operations: [
          {
            type: 'ADD',
            day_number: 1,
            activity: {
              time: '14:00',
              title: 'New Activity',
              location: {
                name: 'Location',
                lat: 35.0,
                lng: 139.0,
              },
            },
          },
        ],
      });

      // Original should remain unchanged
      expect(mockItinerary).toEqual(original);
    });

    it('should update timestamp', () => {
      const result = applyOperations(mockItinerary, {
        operations: [
          {
            type: 'ADD',
            day_number: 1,
            activity: {
              time: '14:00',
              title: 'Test',
              location: {
                name: 'Location',
                lat: 35.0,
                lng: 139.0,
              },
            },
          },
        ],
      });

      expect(result.updated_at).not.toBe(mockItinerary.updated_at);
      expect(new Date(result.updated_at).getTime()).toBeGreaterThan(
        new Date(mockItinerary.updated_at).getTime()
      );
    });
  });
});
