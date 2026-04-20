import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayTransportMode } from "@/components/planner/itinerary/components/day-transport-mode";

describe("DayTransportMode", () => {
  const onSave = vi.fn();
  const onApplyAll = vi.fn();

  beforeEach(() => {
    onSave.mockReset();
    onApplyAll.mockReset();
    onSave.mockResolvedValue(undefined);
    onApplyAll.mockResolvedValue(undefined);
  });

  it("renders four mode buttons", () => {
    render(<DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} />);
    expect(screen.getByTitle("Driving")).toBeInTheDocument();
    expect(screen.getByTitle("Walking")).toBeInTheDocument();
    expect(screen.getByTitle("Transit")).toBeInTheDocument();
    expect(screen.getByTitle("Bicycling")).toBeInTheDocument();
  });

  it("highlights the active mode button", () => {
    render(<DayTransportMode dayNumber={1} mode="walking" onSave={onSave} />);
    const walkingBtn = screen.getByTitle("Walking");
    expect(walkingBtn.className).toMatch(/text-primary/);
  });

  it("does not highlight inactive mode buttons", () => {
    render(<DayTransportMode dayNumber={1} mode="walking" onSave={onSave} />);
    const drivingBtn = screen.getByTitle("Driving");
    expect(drivingBtn.className).not.toMatch(/text-primary/);
  });

  it("calls onSave with correct dayNumber and mode when a mode button is clicked", async () => {
    render(<DayTransportMode dayNumber={2} mode={undefined} onSave={onSave} />);
    fireEvent.click(screen.getByTitle("Driving"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(2, "driving");
    });
  });

  it("does not call onSave when clicking the already-active mode", async () => {
    render(<DayTransportMode dayNumber={1} mode="transit" onSave={onSave} />);
    fireEvent.click(screen.getByTitle("Transit"));
    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it("shows apply-all button when onApplyAll and mode are provided", () => {
    render(
      <DayTransportMode dayNumber={1} mode="driving" onSave={onSave} onApplyAll={onApplyAll} />,
    );
    expect(screen.getByTitle("Apply to all days")).toBeInTheDocument();
  });

  it("does not show apply-all button when mode is undefined", () => {
    render(
      <DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} onApplyAll={onApplyAll} />,
    );
    expect(screen.queryByTitle("Apply to all days")).not.toBeInTheDocument();
  });

  it("calls onApplyAll with the current mode when apply-all is clicked", async () => {
    render(
      <DayTransportMode dayNumber={1} mode="bicycling" onSave={onSave} onApplyAll={onApplyAll} />,
    );
    fireEvent.click(screen.getByTitle("Apply to all days"));
    await waitFor(() => {
      expect(onApplyAll).toHaveBeenCalledOnce();
      expect(onApplyAll).toHaveBeenCalledWith("bicycling");
    });
  });

  it("disables all buttons when onSave is not provided", () => {
    render(<DayTransportMode dayNumber={1} mode="driving" />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
