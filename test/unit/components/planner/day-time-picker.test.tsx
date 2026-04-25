import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayTimePicker } from "@/components/planner/itinerary/components/day-time-picker";

describe("DayTimePicker", () => {
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
      <DayTimePicker
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("08:00");
    expect(button).toHaveTextContent("21:00");
  });

  it("does not show the time panel by default", () => {
    render(
      <DayTimePicker
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
      <DayTimePicker
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Apply to all days")).toBeInTheDocument();
  });

  it("shows the Day N title in the panel", () => {
    render(
      <DayTimePicker
        dayNumber={3}
        startTime="09:00"
        endTime="20:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /09:00.*20:00/i });
    fireEvent.click(button);
    expect(screen.getByText("Day 3 Time Range")).toBeInTheDocument();
  });

  it("calls onSave with correct arguments when save button is clicked", async () => {
    render(
      <DayTimePicker
        dayNumber={2}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(2, "08:00", "21:00");
    });
  });

  it("calls onApplyAll with correct arguments when apply-all button is clicked", async () => {
    render(
      <DayTimePicker
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    fireEvent.click(screen.getByText("Apply to all days"));
    await waitFor(() => {
      expect(onApplyAll).toHaveBeenCalledOnce();
      expect(onApplyAll).toHaveBeenCalledWith("08:00", "21:00");
    });
  });

  it("closes the panel after saving", async () => {
    render(
      <DayTimePicker
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });

  it("closes the panel when clicking outside", async () => {
    render(
      <div>
        <DayTimePicker
          dayNumber={1}
          startTime="08:00"
          endTime="21:00"
          onSave={onSave}
          onApplyAll={onApplyAll}
        />
        <div data-testid="outside">outside</div>
      </div>,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    expect(screen.getByText("Save")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => {
      expect(screen.queryByText("Save")).not.toBeInTheDocument();
    });
  });

  it("re-enables the save button after onSave throws", async () => {
    onSave.mockRejectedValue(new Error("save failed"));
    render(
      <DayTimePicker
        dayNumber={1}
        startTime="08:00"
        endTime="21:00"
        onSave={onSave}
        onApplyAll={onApplyAll}
      />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    const saveButton = screen.getByText("Save").closest("button")!;
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it("renders as disabled when no callbacks are provided", () => {
    render(<DayTimePicker dayNumber={1} startTime="08:00" endTime="21:00" />);
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    expect(button).toBeDisabled();
  });

  it("does not open panel when clicked in readonly mode", () => {
    render(<DayTimePicker dayNumber={1} startTime="08:00" endTime="21:00" />);
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    fireEvent.click(button);
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("renders as disabled when only onSave is provided", () => {
    render(<DayTimePicker dayNumber={1} startTime="08:00" endTime="21:00" onSave={onSave} />);
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    expect(button).toBeDisabled();
  });

  it("renders as disabled when only onApplyAll is provided", () => {
    render(
      <DayTimePicker dayNumber={1} startTime="08:00" endTime="21:00" onApplyAll={onApplyAll} />,
    );
    const button = screen.getByRole("button", { name: /08:00.*21:00/i });
    expect(button).toBeDisabled();
  });
});
