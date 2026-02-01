// ============================================================================
// Core Type Exports
// ============================================================================

// Itinerary types
export type {
  Location,
  Activity,
  ActivityWithDay,
  Day,
  Itinerary,
} from './itinerary';

export {
  LocationSchema,
  ActivitySchema,
  DaySchema,
  ItinerarySchema,
} from './itinerary';

// Chat types
export type {
  ChatMessage,
  ChatSession,
  StreamingResponse,
  StreamingResponseMetadata,
} from './chat';

export {
  ChatMessageSchema,
  ChatSessionSchema,
  StreamingResponseSchema,
  StreamingResponseMetadataSchema,
} from './chat';

// Collaboration types
export type {
  UserPresence,
  CollaborationSession,
  CollaborationSessionConfig,
} from './collaboration';

export {
  UserPresenceSchema,
  CollaborationSessionConfigSchema,
} from './collaboration';

// User types
export type {
  UserTier,
  UserProfile,
  ThemeMode,
  ThemePreference,
} from './user';

export {
  UserTierSchema,
  UserProfileSchema,
  ThemeModeSchema,
  ThemePreferenceSchema,
} from './user';
