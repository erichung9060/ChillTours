import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/components/planner/itinerary/components/day-activities-list", () => ({
  DayActivitiesList: () => <div data-testid="day-activities-list" />,
}));

vi.mock("@/lib/utils/date", () => ({
  formatDayHeader: () => "May 1, 2026",
  calculateDayDate: () => "2026-05-01",
}));

import { ExpandableView } from "@/components/planner/itinerary/views/expandable-view";
import { SingleDayView } from "@/components/planner/itinerary/views/single-day-view";
import { SideBySideView } from "@/components/planner/itinerary/views/side-by-side-view";
import type { Itinerary } from "@/types/itinerary";

const baseItinerary: Itinerary = {
  id: "itin-1",
  user_id: "u1",
  title: "Test Trip",
  destination: "Tokyo",
  start_date: "2026-05-01",
  end_date: "2026-05-03",
  preferences: undefined,
  days: [
    { day_number: 1, activities: [], start_time: "09:00", end_time: "20:00" },
    { day_number: 2, activities: [], start_time: "08:00", end_time: "21:00" },
  ],
  status: "completed",
  link_access: "none",
  created_at: "2026-04-16T00:00:00Z",
  updated_at: "2026-04-16T00:00:00Z",
};

const noop = vi.fn().mockResolvedValue(undefined);

// ──────────────────────────────────────────────────────────────────────────────
// ExpandableView
// ──────────────────────────────────────────────────────────────────────────────

describe("ExpandableView - DayTimeEditor integration", () => {
  beforeEach(() => noop.mockClear());

  it("shows time display for each day when callbacks are provided", () => {
    render(
      <ExpandableView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        expandedDays={new Set()}
        toggleDay={vi.fn()}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    expect(screen.getByText("09:00 – 20:00")).toBeInTheDocument();
    expect(screen.getByText("08:00 – 21:00")).toBeInTheDocument();
  });

  it("does not show time display when callbacks are not provided", () => {
    render(
      <ExpandableView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        expandedDays={new Set()}
        toggleDay={vi.fn()}
      />,
    );
    expect(screen.queryByText("09:00 – 20:00")).not.toBeInTheDocument();
    expect(screen.queryByText("08:00 – 21:00")).not.toBeInTheDocument();
  });

  it("opens the time panel and calls onSave with correct args", async () => {
    render(
      <ExpandableView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        expandedDays={new Set()}
        toggleDay={vi.fn()}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    fireEvent.click(screen.getByText("09:00 – 20:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(noop).toHaveBeenCalledWith(1, "09:00", "20:00");
    });
  });

  it("uses default time when day has no start_time or end_time", () => {
    const itinerary: Itinerary = {
      ...baseItinerary,
      days: [{ day_number: 1, activities: [] }],
    };
    render(
      <ExpandableView
        itinerary={itinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        expandedDays={new Set()}
        toggleDay={vi.fn()}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    expect(screen.getByText("09:00 – 20:00")).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SingleDayView
// ──────────────────────────────────────────────────────────────────────────────

describe("SingleDayView - DayTimeEditor integration", () => {
  beforeEach(() => noop.mockClear());

  it("shows time display when callbacks are provided", () => {
    render(
      <SingleDayView
        itinerary={baseItinerary}
        currentDayIndex={0}
        draggingActivityId={null}
        crossDayDragInfo={null}
        goToPreviousDay={vi.fn()}
        goToNextDay={vi.fn()}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    expect(screen.getByText("09:00 – 20:00")).toBeInTheDocument();
  });

  it("does not show time display when callbacks are not provided", () => {
    render(
      <SingleDayView
        itinerary={baseItinerary}
        currentDayIndex={0}
        draggingActivityId={null}
        crossDayDragInfo={null}
        goToPreviousDay={vi.fn()}
        goToNextDay={vi.fn()}
      />,
    );
    expect(screen.queryByText("09:00 – 20:00")).not.toBeInTheDocument();
  });

  it("calls onApplyAll with correct args when apply-all is clicked", async () => {
    render(
      <SingleDayView
        itinerary={baseItinerary}
        currentDayIndex={0}
        draggingActivityId={null}
        crossDayDragInfo={null}
        goToPreviousDay={vi.fn()}
        goToNextDay={vi.fn()}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    fireEvent.click(screen.getByText("09:00 – 20:00"));
    fireEvent.click(screen.getByText("Apply to all days"));
    await waitFor(() => {
      expect(noop).toHaveBeenCalledWith("09:00", "20:00");
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SideBySideView
// ──────────────────────────────────────────────────────────────────────────────

describe("SideBySideView - DayTimeEditor integration", () => {
  beforeEach(() => noop.mockClear());

  it("shows time display for each day when callbacks are provided", () => {
    render(
      <SideBySideView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    expect(screen.getByText("09:00 – 20:00")).toBeInTheDocument();
    expect(screen.getByText("08:00 – 21:00")).toBeInTheDocument();
  });

  it("does not show time display when callbacks are not provided", () => {
    render(
      <SideBySideView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
      />,
    );
    expect(screen.queryByText("09:00 – 20:00")).not.toBeInTheDocument();
    expect(screen.queryByText("08:00 – 21:00")).not.toBeInTheDocument();
  });

  it("calls onSave with correct args for the right day", async () => {
    render(
      <SideBySideView
        itinerary={baseItinerary}
        draggingActivityId={null}
        crossDayDragInfo={null}
        setDayTimeWindow={noop}
        setAllDaysTimeWindow={noop}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(noop).toHaveBeenCalledWith(2, "08:00", "21:00");
    });
  });
});
