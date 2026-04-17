import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayTimeEditor } from "@/components/planner/itinerary/components/day-time-editor";

describe("DayTimeEditor", () => {
  const onSave = vi.fn();
  const onApplyAll = vi.fn();

  beforeEach(() => {
    onSave.mockReset();
    onApplyAll.mockReset();
    onSave.mockResolvedValue(undefined);
    onApplyAll.mockResolvedValue(undefined);
  });

  it("displays startTime – endTime by default", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    expect(screen.getByText("08:00 – 21:00")).toBeInTheDocument();
  });

  it("does not show the time panel by default", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("opens the time panel when clicked", () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Apply to all days")).toBeInTheDocument();
  });

  it("shows the Day N title in the panel", () => {
    render(
      <DayTimeEditor
        dayNumber={3}
        startTime="09:00"
        endTime="20:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("09:00 – 20:00"));
    expect(screen.getByText("Day 3 Time Range")).toBeInTheDocument();
  });

  it("calls onSave with correct arguments when save button is clicked", async () => {
    render(
      <DayTimeEditor
        dayNumber={2}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(2, "08:00", "21:00");
    });
  });

  it("calls onApplyAll with correct arguments when apply-all button is clicked", async () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("Apply to all days"));
    await waitFor(() => {
      expect(onApplyAll).toHaveBeenCalledOnce();
      expect(onApplyAll).toHaveBeenCalledWith("08:00", "21:00");
    });
  });

  it("closes the panel after saving", async () => {
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });

  it("closes the panel when clicking outside", async () => {
    render(
      <div>
        <DayTimeEditor
          dayNumber={1}
          startTime="08:00"
          endTime="21:00"
          onSave={onSave}
          onApplyAll={onApplyAll}
        />
        <div data-testid="outside">outside</div>
      </div>,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    expect(screen.getByText("Save")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });

  it("re-enables the save button after onSave throws", async () => {
    onSave.mockRejectedValue(new Error("save failed"));
    render(
      <DayTimeEditor
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    fireEvent.click(screen.getByText("08:00 – 21:00"));
    const saveButton = screen.getByText("Save").closest("button")!;
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});
