import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActivityCard } from "@/components/planner/itinerary/components/activity-card";
import type { Activity } from "@/types/itinerary";

const createNavigationLinkMock = vi.fn(() => "https://maps.example.com/route");

vi.mock("@/lib/maps/utils", () => ({
  createNavigationLink: (...args: unknown[]) => createNavigationLinkMock(...args),
}));

vi.mock("@/components/planner/itinerary/components/edit-activity-dialog", () => ({
  EditActivityDialog: () => null,
}));

describe("ActivityCard", () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    openSpy.mockReset();
    createNavigationLinkMock.mockClear();
    window.open = openSpy;
  });

  const baseActivity: Activity = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    time: "10:00",
    title: "Visit museum",
    note: "Check the special exhibition",
    location: {
      name: "City Museum",
      website: "https://museum.example.com",
    },
    duration_minutes: 90,
    order: 0,
  };

  it("opens location.website when the external-link button is clicked", () => {
    render(<ActivityCard activity={baseActivity} />);

    fireEvent.click(screen.getByTitle("Open Website"));

    expect(openSpy).toHaveBeenCalledWith("https://museum.example.com", "_blank");
    expect(createNavigationLinkMock).not.toHaveBeenCalled();
  });

  it("falls back to navigation link when location.website is missing", () => {
    render(
      <ActivityCard
        activity={{
          ...baseActivity,
          location: {
            name: "City Museum",
          },
        }}
      />,
    );

    fireEvent.click(screen.getByTitle("Open Website"));

    expect(createNavigationLinkMock).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith("https://maps.example.com/route", "_blank");
  });
});
