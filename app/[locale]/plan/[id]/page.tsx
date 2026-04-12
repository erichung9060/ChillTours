/**
 * Planning Interface Page
 *
 * Three-panel layout: itinerary (left), map (center), chat (right, collapsible)
 * Responsive layout for mobile (single-column)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "@/lib/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { ItineraryPanel } from "@/components/planner/itinerary-panel";
import { MapPanel } from "@/components/planner/map-panel";
import { ChatPanel } from "@/components/planner/chat-panel";
import { Loading } from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ui/error-message";
import { useItineraryStore } from "@/components/planner/itinerary/store";

// Panel width constraints
const MIN_ITINERARY_PANEL_WIDTH = 700;
const MIN_MAP_PANEL_WIDTH = 300;
const MIN_CHAT_PANEL_WIDTH = 200;
const DAY_CARD_WIDTH = 320; // Width of each day card in side-by-side view
const DAY_CARD_GAP = 16; // Gap between day cards
const PANEL_PADDING = 35; // Padding inside the panel

// Calculate initial itinerary panel width based on number of days
const calculateInitialItineraryWidth = (numDays: number): number => {
  // Return minimum width for SSR or empty itinerary
  if (typeof window === "undefined" || numDays === 0) {
    return MIN_ITINERARY_PANEL_WIDTH;
  }

  const windowWidth = window.innerWidth;
  const minMapWidth = Math.max(windowWidth * 0.25, MIN_MAP_PANEL_WIDTH);
  const maxItineraryWidth = Math.max(
    MIN_ITINERARY_PANEL_WIDTH,
    windowWidth - minMapWidth - MIN_CHAT_PANEL_WIDTH / 2,
  ); // Leave some space for chat if needed

  const neededWidth = Math.max(
    MIN_ITINERARY_PANEL_WIDTH,
    numDays * DAY_CARD_WIDTH + (numDays - 1) * DAY_CARD_GAP + PANEL_PADDING,
  );

  return Math.min(neededWidth, maxItineraryWidth);
};

export default function PlanningPage() {
  const params = useParams();
  const itineraryId = params.id as string;
  const locale = useLocale();
  const t = useTranslations("planner");

  // Store Lifecycle & Data
  const fetchItinerary = useItineraryStore((state) => state.fetchItinerary);
  const itinerary = useItineraryStore((state) => state.itinerary);
  const isLoading = useItineraryStore((state) => state.isLoading);
  const error = useItineraryStore((state) => state.error);
  const errorKind = useItineraryStore((state) => state.errorKind);
  const isGenerating = useItineraryStore((state) => state.isGenerating);
  const startStreaming = useItineraryStore((state) => state.startStreaming);
  const startPolling = useItineraryStore((state) => state.startPolling);
  const stopPolling = useItineraryStore((state) => state.stopPolling);
  const setSelectedDay = useItineraryStore((state) => state.setSelectedDay);

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [viewMode, setViewMode] = useState<"expandable" | "single-day" | "side-by-side">(
    "side-by-side",
  );
  const [selectedDayIndex, setCurrentDayIndex] = useState(0);
  const [userAdjustedWidth, setUserAdjustedWidth] = useState<number | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState(400);
  const [isResizingItinerary, setIsResizingItinerary] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);

  const currentDayIndex = useMemo(() => {
    if (!itinerary || selectedDayIndex < itinerary.days.length) return selectedDayIndex;
    return 0;
  }, [selectedDayIndex, itinerary]);

  useEffect(() => {
    if (viewMode === "single-day" && itinerary) {
      setSelectedDay(itinerary.days[currentDayIndex]?.day_number ?? null);
    } else {
      setSelectedDay(null);
    }
  }, [viewMode, itinerary, currentDayIndex, setSelectedDay]);

  // Load itinerary data via Store Action
  useEffect(() => {
    fetchItinerary(itineraryId);
  }, [itineraryId, fetchItinerary]);

  const itineraryPanelWidth =
    userAdjustedWidth ?? calculateInitialItineraryWidth(itinerary?.days.length ?? 0);

  useEffect(() => {
    if (!itinerary) return;

    if (
      (!itinerary.status || itinerary.status === "draft" || itinerary.status === "failed") &&
      itinerary.days.length === 0
    ) {
      // Fresh itinerary — trigger SSE streaming
      startStreaming(itinerary.id, locale); // metadata read from DB in Edge Function
    } else if (itinerary.status === "generating") {
      // User returned mid-generation — use polling
      startPolling(itinerary.id);
    }

    return () => {
      // Cleanup: stop polling and abort any in-flight SSE streaming
      stopPolling();
      const controller = useItineraryStore.getState().generationAbortController;
      controller?.abort();
    };
    // Zustand actions (startStreaming, startPolling, stopPolling) are stable refs
    // and do not need to be listed. The full `itinerary` object is intentionally
    // excluded: tracking only id + status prevents this effect from re-firing on
    // every activity append during streaming, which would restart the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary?.id, itinerary?.status, locale]);

  // Handle fullscreen mode change
  const handleFullscreenChange = (isFullscreen: boolean) => {
    setIsMapVisible(!isFullscreen);
  };

  // Toggle chat panel (Requirement 4.4)
  const toggleChat = () => {
    const nextOpen = !isChatOpen;
    if (nextOpen && typeof window !== "undefined") {
      const windowWidth = window.innerWidth;
      const availableWidthForAll = windowWidth - MIN_MAP_PANEL_WIDTH;

      // If current widths + map min width exceed window, adjust them
      if (itineraryPanelWidth + chatPanelWidth > availableWidthForAll) {
        // Try to keep chat width, reduce itinerary width
        const newItineraryWidth = Math.max(
          MIN_ITINERARY_PANEL_WIDTH,
          windowWidth - chatPanelWidth - MIN_MAP_PANEL_WIDTH,
        );
        setUserAdjustedWidth(newItineraryWidth);

        // If itinerary is at min and still exceeds, reduce chat width
        if (newItineraryWidth + chatPanelWidth > availableWidthForAll) {
          setChatPanelWidth(
            Math.max(MIN_CHAT_PANEL_WIDTH, windowWidth - newItineraryWidth - MIN_MAP_PANEL_WIDTH),
          );
        }
      }
    }
    setIsChatOpen(nextOpen);
  };

  // Handle resizing of itinerary panel
  const handleItineraryPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingItinerary(true);
  };

  // Handle resizing of chat panel
  const handleChatPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;

      // Handle itinerary panel resizing
      if (isResizingItinerary) {
        const newItineraryWidth = e.clientX;
        const currentChatWidth = isChatOpen ? chatPanelWidth : 0;
        const maxItineraryWidth = windowWidth - currentChatWidth - MIN_MAP_PANEL_WIDTH;

        // Enforce minimum itinerary width and minimum map width
        if (newItineraryWidth >= MIN_ITINERARY_PANEL_WIDTH) {
          setUserAdjustedWidth(Math.min(newItineraryWidth, maxItineraryWidth));
        }
      }

      // Handle chat panel resizing
      if (isResizingChat) {
        const newChatWidth = windowWidth - e.clientX;
        const maxChatWidth = windowWidth - itineraryPanelWidth - MIN_MAP_PANEL_WIDTH;

        // Enforce minimum chat width, minimum itinerary width, and minimum map width
        if (newChatWidth >= MIN_CHAT_PANEL_WIDTH && e.clientX >= MIN_ITINERARY_PANEL_WIDTH) {
          setChatPanelWidth(Math.min(newChatWidth, maxChatWidth));
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingItinerary(false);
      setIsResizingChat(false);
    };

    const isResizing = isResizingItinerary || isResizingChat;

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    // chatPanelWidth, isChatOpen, and itineraryPanelWidth are intentionally
    // omitted: adding them would re-attach the listener on every pixel dragged,
    // causing flicker. The closure reads the latest values correctly because
    // React flushes state updates synchronously within the same event loop tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizingItinerary, isResizingChat]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center pt-16">
          <Loading size="lg" text={t("loading")} />
        </main>
      </>
    );
  }

  if (error) {
    const title = errorKind === "access" ? t("accessError") : t("loadError");
    const message =
      errorKind === "access"
        ? t("accessErrorMessage")
        : error === "INSUFFICIENT_CREDITS"
          ? t("errorInsufficientCredits")
          : error;

    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center pt-16 px-4">
          <ErrorMessage
            title={title}
            message={message}
            onRetry={() => fetchItinerary(itineraryId)}
          />
        </main>
      </>
    );
  }

  if (!itinerary) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center pt-16">
          <Loading size="lg" text={t("loading")} />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      {isGenerating && (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg pointer-events-auto mt-2">
            <svg
              className="animate-spin h-4 w-4 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">{t("generating")}</span>
          </div>
        </div>
      )}
      <main className="h-screen flex flex-col pt-16">
        {/* Three-panel layout (Requirement 4.1) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Itinerary Panel (Requirement 4.2) - Resizable */}
          <div
            className={`hidden md:block border-r border-border overflow-y-auto relative ${!isMapVisible ? "flex-1" : ""}`}
            style={isMapVisible ? { width: `${itineraryPanelWidth}px` } : undefined}
          >
            <ItineraryPanel
              onFullscreenChange={handleFullscreenChange}
              onToggleChat={toggleChat}
              isChatOpen={isChatOpen}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentDayIndex={currentDayIndex}
              onCurrentDayChange={setCurrentDayIndex}
            />

            {/* Resize Handle - Only show when map is visible */}
            {isMapVisible && (
              <div
                className="absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors group"
                onMouseDown={handleItineraryPanelResize}
              ></div>
            )}
          </div>

          {/* Mobile: Full-width Itinerary Panel */}
          <div className="md:hidden w-full border-r border-border overflow-y-auto">
            <ItineraryPanel
              onFullscreenChange={handleFullscreenChange}
              onToggleChat={toggleChat}
              isChatOpen={isChatOpen}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currentDayIndex={currentDayIndex}
              onCurrentDayChange={setCurrentDayIndex}
            />
          </div>

          {/* Center Panel: Map (Requirement 4.3) - Conditionally rendered */}
          {isMapVisible && (
            <div
              className="hidden md:flex flex-1 relative bg-muted/20"
              style={{ minWidth: `${MIN_MAP_PANEL_WIDTH}px` }}
            >
              <MapPanel itinerary={itinerary} />
            </div>
          )}

          {/* Chat Panel (Collapsible) (Requirement 4.4) - Resizable, Always positioned at right edge */}
          {/* Only show on desktop (md+) when chat is open */}
          {isChatOpen && (
            <div
              className="hidden md:block relative border-l border-border"
              style={{ width: `${chatPanelWidth}px` }}
            >
              {/* Resize Handle - on the left side of chat panel */}
              <div
                className="absolute top-0 left-0 w-3 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
                onMouseDown={handleChatPanelResize}
              ></div>
              <ChatPanel
                itinerary={itinerary}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
