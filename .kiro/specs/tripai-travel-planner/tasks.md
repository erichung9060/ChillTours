# Implementation Plan: TripAI Travel Planner

## Overview

This implementation plan breaks down the TripAI travel planner into discrete, incremental tasks following the Single Responsibility Principle. Each task builds upon previous work, with property-based tests integrated throughout to validate correctness. The plan prioritizes core functionality first, with optional testing tasks marked for flexibility.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - Initialize Next.js 15 project with TypeScript and App Router
  - Configure Tailwind CSS and Shadcn/ui components
  - Set up ESLint, Prettier, and TypeScript strict mode
  - Install core dependencies: Supabase client, Yjs, Google Maps, fast-check
  - Create project directory structure following the design document
  - Configure environment variables for development
  - _Requirements: 16.1, 16.2, 16.3_

- [x] 1.1 Set up testing infrastructure
  - Configure Vitest for unit and property-based testing
  - Create test directory structure
  - Set up test utilities and helpers
  - _Requirements: 16.1_

- [x] 2. Supabase Backend Setup
  - Initialize Supabase project
  - Create database schema with migrations (profiles, itineraries, itinerary_shares tables)
  - Implement Row Level Security (RLS) policies
  - Set up Google OAuth authentication
  - Create database indexes for performance
  - Implement free tier limit trigger function
  - _Requirements: 1.1, 1.2, 10.1, 10.2_

- [x] 2.1 Write property test for RLS policies
  - **Property 1: Authentication Profile Management**
  - **Validates: Requirements 1.2**

- [x] 3. Core Type Definitions and Data Models
  - Create TypeScript interfaces for Itinerary, Day, Activity, Location
  - Create interfaces for ChatSession, ChatMessage, StreamingResponse
  - Create interfaces for CollaborationSession, UserPresence
  - Generate Supabase database types
  - Create validation schemas using Zod or similar
  - _Requirements: 3.3, 8.1, 11.1_

- [x] 3.1 Write property test for data model validation
  - **Property 4: Input Validation Rejects Empty Values**
  - **Validates: Requirements 2.3**

- [x] 4. Authentication Implementation
  - Create Supabase client wrapper in lib/supabase/client.ts
  - Implement authentication hooks (useAuth)
  - Create login page with Google OAuth button
  - Implement OAuth callback page (simplified - Supabase Cloud handles OAuth)
  - Create session persistence logic
  - Implement sign-out functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Note: Using Supabase Cloud service - OAuth callback and profile creation handled automatically_

- [x] 4.1 Write property test for session persistence
  - **Property 2: Session Persistence Across Refreshes**
  - **Validates: Requirements 1.4**

- [x] 4.2 Write property test for sign-out cleanup
  - **Property 3: Sign-out Cleanup**
  - **Validates: Requirements 1.5**

- [x] 5. Theme System Implementation
  - Create ThemeProvider component with Context API
  - Implement useTheme hook
  - Create ThemeToggle UI component
  - Implement local storage persistence for theme preference
  - Configure Tailwind for dark mode support
  - Apply theme to all UI components
  - _Requirements: 2.1, 2.5, 13.1, 13.2, 13.3, 13.4_

- [x] 5.1 Write property test for theme round-trip
  - **Property 5: Theme Toggle Round-trip**
  - **Validates: Requirements 2.5, 13.1, 13.2, 13.4**

- [x] 6. Shared UI Components Library
  - Create Button component with theme variants
  - Create Input component with validation states
  - Create Card component
  - Create Loading spinner component
  - Create Error message component
  - Create Modal/Dialog component
  - _Requirements: 20.1, 20.4, 20.5_

- [ ] 7. Landing Page Implementation
  - Create landing page layout (app/page.tsx)
  - Implement HeroSection component with Gen Z styling
  - Create TripForm component with destination, duration, and custom requirements inputs
  - Display custom requirements as a larger textarea positioned below destination and duration
  - Implement form validation (destination required, custom requirements optional)
  - Add loading state during itinerary generation
  - Implement navigation to planning interface
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 7.1 Write unit tests for form validation
  - Test empty destination rejection
  - Test valid destination acceptance
  - Test optional custom requirements handling
  - _Requirements: 2.5_

- [ ] 8. Supabase Edge Function: Generate Itinerary
  - Create Edge Function in supabase/functions/generate-itinerary/
  - Implement Gemini API client wrapper
  - Create structured prompt for itinerary generation including custom requirements
  - Implement streaming response handling
  - Parse AI response into Itinerary structure
  - Handle errors and retries
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 14.2, 14.3_

- [ ] 8.1 Write property test for streaming delivery
  - **Property 7: Streaming Response Delivery**
  - **Validates: Requirements 3.3, 8.2, 18.1**

- [ ] 8.2 Write property test for itinerary parsing
  - **Property 8: Itinerary Parsing Completeness**
  - **Validates: Requirements 3.4**

- [ ] 9. Frontend Gemini Integration
  - Create Gemini client in lib/gemini/client.ts
  - Implement streaming response handler
  - Create itinerary parser in lib/gemini/parser.ts
  - Implement error handling for API failures
  - Add retry logic with exponential backoff
  - _Requirements: 3.3, 3.4, 3.5, 17.1, 17.3_

- [ ] 10. Session Management
  - Implement session state management with React Context
  - Create useSession hook
  - Implement in-memory chat history storage
  - Ensure session clears on page refresh
  - Verify chat history is never persisted to database
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10.1 Write property test for session initialization
  - **Property 20: Session Initialization**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 10.2 Write property test for chat history non-persistence
  - **Property 21: Chat History Non-Persistence**
  - **Validates: Requirements 9.4, 9.5**

- [ ] 11. Checkpoint - Core Infrastructure Complete
  - Ensure all tests pass
  - Verify authentication flow works end-to-end
  - Verify theme switching works
  - Verify landing page renders correctly
  - Ask the user if questions arise

- [ ] 12. Itinerary Data Layer
  - Create Supabase database client functions for itineraries
  - Implement saveItinerary function
  - Implement loadItinerary function
  - Implement deleteItinerary function
  - Implement listUserItineraries function
  - Handle free tier limit enforcement
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 12.1 Write property test for itinerary persistence
  - **Property 22: Itinerary Database Persistence**
  - **Validates: Requirements 10.1**

- [ ] 12.2 Write property test for save-load round-trip
  - **Property 23: Itinerary Save-Load Round-trip**
  - **Validates: Requirements 10.3**

- [ ] 12.3 Write property test for itinerary deletion
  - **Property 24: Itinerary Deletion**
  - **Validates: Requirements 10.4**

- [ ] 13. Planning Interface Layout
  - Create planning page (app/plan/[id]/page.tsx)
  - Implement three-panel layout (itinerary, map, chat)
  - Create responsive layout for mobile
  - Implement collapsible chat panel
  - Add loading states for data fetching
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 13.1 Write property test for chat panel toggle
  - **Property 10: Chat Panel Toggle State**
  - **Validates: Requirements 4.4**

- [ ] 14. Itinerary Panel Components
  - Create ItineraryPanel component
  - Create DaySection component with expand/collapse
  - Create ActivityItem component
  - Implement full view and daily view modes
  - Display activity details (time, location, description)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14.1 Write property test for day section toggle
  - **Property 11: Day Section Expand/Collapse**
  - **Validates: Requirements 5.2**

- [ ] 14.2 Write property test for activity display completeness
  - **Property 12: Activity Display Completeness**
  - **Validates: Requirements 5.5**

- [ ] 15. Google Maps Integration
  - Create Maps client in lib/maps/client.ts
  - Initialize Google Maps in MapPanel component
  - Implement pin placement for activities
  - Create pin click handler with location details popup
  - Implement geocoding for location lookup
  - Generate navigation links for mobile
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2_

- [ ] 15.1 Write property test for map pin placement
  - **Property 13: Map Pin Placement**
  - **Validates: Requirements 6.1**

- [ ] 15.2 Write property test for pin click details
  - **Property 14: Pin Click Details Display**
  - **Validates: Requirements 6.2**

- [ ] 16. Drag-and-Drop Itinerary Editing
  - Install and configure drag-and-drop library (dnd-kit or react-beautiful-dnd)
  - Implement drag handles on ActivityItem components
  - Add visual feedback during drag operations
  - Implement drop handler for reordering within same day
  - Implement drop handler for moving between days
  - Update itinerary state on drop
  - Persist changes to session memory
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 16.1 Write property test for drag-drop reordering
  - **Property 16: Drag-Drop Reordering**
  - **Validates: Requirements 7.2**

- [ ] 16.2 Write property test for cross-day movement
  - **Property 17: Cross-Day Activity Movement**
  - **Validates: Requirements 7.4**

- [ ] 16.3 Write property test for reordering persistence
  - **Property 18: Reordering Persistence**
  - **Validates: Requirements 7.5**

- [ ] 17. Map-Itinerary Synchronization
  - Implement itinerary change observer
  - Update map pins when itinerary changes
  - Highlight pin when itinerary item is clicked
  - Maintain pin-activity correspondence
  - _Requirements: 6.3, 7.3_

- [ ] 17.1 Write property test for itinerary-map synchronization
  - **Property 15: Itinerary-Map Synchronization**
  - **Validates: Requirements 6.3, 7.3**

- [ ] 18. Checkpoint - Core Planning Interface Complete
  - Ensure all tests pass
  - Verify itinerary display works correctly
  - Verify map integration works
  - Verify drag-and-drop reordering works
  - Ask the user if questions arise

- [ ] 19. Supabase Edge Function: Chat
  - Create Edge Function in supabase/functions/chat/
  - Implement chat endpoint with conversation history
  - Include itinerary context in API requests
  - Implement streaming response handling
  - Parse AI responses for itinerary update intents
  - Handle errors and retries
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 14.2, 14.3_

- [ ] 19.1 Write property test for context inclusion
  - **Property 6: Gemini API Request Context Inclusion**
  - **Validates: Requirements 3.1, 8.1**

- [ ] 19.2 Write property test for itinerary update parsing
  - **Property 19: Itinerary Update Parsing and Application**
  - **Validates: Requirements 8.3**

- [ ] 20. Chat Interface Implementation
  - Create ChatPanel component
  - Implement message display with user/assistant roles
  - Create message input component
  - Implement streaming message display with typing indicator
  - Handle message submission
  - Maintain scroll position at bottom
  - Apply itinerary updates from AI responses
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 18.1, 18.2, 18.3_

- [ ] 20.1 Write property test for streaming completion marking
  - **Property 36: Streaming Completion Marking**
  - **Validates: Requirements 18.3**

- [ ] 20.2 Write property test for session memory storage
  - **Property 9: Session Memory Storage**
  - **Validates: Requirements 3.6, 8.5**

- [ ] 21. Yjs Collaboration Setup
  - Install Yjs and y-websocket packages
  - Create CollaborationProvider in lib/collaboration/provider.ts
  - Implement Yjs document initialization
  - Set up WebSocket provider connection
  - Create Yjs-Itinerary conversion functions
  - Implement change observers
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 22. Supabase Realtime Configuration
  - Enable Realtime for itineraries table
  - Create WebSocket proxy API route (app/api/yjs/route.ts)
  - Configure Yjs WebSocket provider to use Supabase Realtime
  - Implement connection status monitoring
  - _Requirements: 11.1, 11.2_

- [ ] 23. Collaborative Editing Integration
  - Integrate CollaborationProvider into planning interface
  - Bind Yjs document to itinerary state
  - Implement automatic synchronization on changes
  - Display online users list
  - Handle connection/disconnection gracefully
  - Queue changes during offline periods
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 23.1 Write property test for collaborative edit synchronization
  - **Property 26: Collaborative Edit Synchronization**
  - **Validates: Requirements 11.1, 11.2**

- [ ] 23.2 Write property test for conflict-free concurrent edits
  - **Property 27: Conflict-Free Concurrent Edits**
  - **Validates: Requirements 11.3**

- [ ] 23.3 Write property test for session join
  - **Property 28: Collaborative Session Join**
  - **Validates: Requirements 11.4**

- [ ] 23.4 Write property test for reconnection state preservation
  - **Property 29: Reconnection State Preservation**
  - **Validates: Requirements 11.5**

- [ ] 24. Mobile Responsive Design
  - Implement responsive breakpoints for mobile
  - Create simplified mobile view for itinerary
  - Hide complex editing features on mobile
  - Ensure navigation links work on mobile
  - Test theme persistence on mobile
  - Optimize touch interactions
  - _Requirements: 4.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 24.1 Write property test for mobile activity display
  - **Property 30: Mobile Activity Display**
  - **Validates: Requirements 12.1**

- [ ] 24.2 Write property test for mobile theme persistence
  - **Property 31: Mobile Theme Persistence**
  - **Validates: Requirements 12.4**

- [ ] 25. Error Handling and User Feedback
  - Implement error boundary components
  - Create user-friendly error messages for API failures
  - Add network connectivity detection
  - Implement validation error highlighting
  - Add fallback UI for AI generation failures
  - Ensure secure error logging without sensitive data
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 25.1 Write property test for API error feedback
  - **Property 34: API Error User Feedback**
  - **Validates: Requirements 17.1**

- [ ] 25.2 Write property test for validation error highlighting
  - **Property 35: Validation Error Highlighting**
  - **Validates: Requirements 17.4**

- [ ] 25.3 Write property test for secure error logging
  - **Property 33: Secure Error Logging**
  - **Validates: Requirements 14.5**

- [ ] 26. API Key Security Implementation
  - Verify Google Maps API key is domain-restricted
  - Ensure Gemini API key is only in Edge Function environment
  - Implement API key validation in Edge Functions
  - Add security checks to prevent key exposure
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 26.1 Write property test for API key security
  - **Property 32: API Key Security**
  - **Validates: Requirements 14.4**

- [ ] 27. Performance Optimization
  - Implement code splitting for heavy components
  - Add lazy loading for map and chat
  - Optimize image loading with Next.js Image
  - Implement caching with SWR for API responses
  - Add loading skeletons for better perceived performance
  - Optimize Yjs document structure
  - _Requirements: 18.5_

- [ ] 27.1 Write property test for first token latency
  - **Property 37: First Token Latency**
  - **Validates: Requirements 18.5**

- [ ] 28. Internationalization Foundation
  - Install i18n framework (next-intl)
  - Extract all UI strings to translation files
  - Create English translation file
  - Implement language context provider
  - Prepare structure for future Chinese localization
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 29. Itinerary List and Management
  - Create itinerary list page
  - Display saved itineraries with destination and dates
  - Implement itinerary deletion with confirmation
  - Show free tier limit indicator
  - Add "Create New" button
  - _Requirements: 10.2, 10.4, 10.5_

- [ ] 29.1 Write property test for itinerary list display
  - **Property 25: Itinerary List Display**
  - **Validates: Requirements 10.5**

- [ ] 30. Final Integration and Polish
  - Integrate all components into complete user flow
  - Add smooth animations and transitions
  - Implement loading states throughout
  - Add helpful tooltips and onboarding hints
  - Ensure consistent styling across all pages
  - Test complete user journey from landing to planning
  - _Requirements: 20.3, 20.4, 20.5_

- [ ] 31. Deployment Preparation
  - Configure production environment variables
  - Set up Vercel deployment
  - Configure Supabase production environment
  - Set up domain restrictions for Google Maps API key
  - Configure Edge Function secrets
  - Set up monitoring and error tracking
  - _Requirements: 14.1, 14.2_

- [ ] 32. Final Checkpoint - Complete System Test
  - Run full test suite (unit + property tests)
  - Perform end-to-end testing of all features
  - Test authentication flow
  - Test itinerary generation and editing
  - Test collaborative editing with multiple users
  - Test mobile responsive design
  - Verify all error handling works
  - Ensure all tests pass
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive quality assurance
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation
- The implementation follows a bottom-up approach: infrastructure → data layer → UI → integration
- Collaboration features are implemented after core functionality is stable
- Mobile optimization is done after desktop version is complete
- Performance optimization is done after functionality is complete
