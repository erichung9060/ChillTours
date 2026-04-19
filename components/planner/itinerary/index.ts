/**
 * Barrel export for itinerary components and utilities
 */

// Types
export * from "./types";

// Constants
export * from "./constants";

// Components
export { ActivityCard } from "./components/activity-card";
export { ActivityPlaceholderCard } from "./components/activity-placeholder-card";
export { SortableActivity } from "./components/sortable-activity";
export { DroppableDay } from "./components/droppable-day";
export { DayActivitiesList } from "./components/day-activities-list";
export { PanelHeader } from "./components/panel-header";
export { ChatToggleButton } from "./components/chat-toggle-button";
export { AddActivityDialog } from "./components/add-activity-dialog";

// Views
export { ExpandableView } from "./views/expandable-view";
export { SingleDayView } from "./views/single-day-view";
export { SideBySideView } from "./views/side-by-side-view";

// Hooks
export { useYjsSync } from "./hooks/use-yjs-sync";

// Utilities
export * from "./utils/drag-handlers";
