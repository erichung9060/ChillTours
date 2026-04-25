import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DayTransportMode } from "@/components/planner/itinerary/components/day-transport-mode";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("DayTransportMode", () => {
  const onSave = vi.fn();
  const onApplyAll = vi.fn();

  beforeEach(() => {
    onSave.mockReset();
    onApplyAll.mockReset();
    onSave.mockResolvedValue(undefined);
    onApplyAll.mockResolvedValue(undefined);
  });

  const openDropdown = () => {
    // The trigger is always the first button (only one before dropdown opens)
    fireEvent.click(screen.getAllByRole("button")[0]);
  };

  // Click a dropdown option by its display text (finds within the dropdown panel)
  const clickDropdownOption = (text: string) => {
    const allButtons = screen.getAllByRole("button");
    // Dropdown options are after the trigger (index 0)
    const option = allButtons.find((b, i) => i > 0 && b.textContent?.includes(text));
    if (!option) throw new Error(`Dropdown option "${text}" not found`);
    fireEvent.click(option);
  };

  it("renders a trigger button showing the active mode name", () => {
    render(<DayTransportMode dayNumber={1} mode="walking" onSave={onSave} />);
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("Walking");
  });

  it("renders a trigger button showing placeholder when no mode is set", () => {
    render(<DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} />);
    expect(screen.getByRole("button")).toHaveTextContent("Mode");
  });

  it("opens dropdown with all four mode options on trigger click", () => {
    render(<DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} />);
    openDropdown();
    expect(screen.getByText("Driving")).toBeInTheDocument();
    expect(screen.getByText("Walking")).toBeInTheDocument();
    expect(screen.getByText("Transit")).toBeInTheDocument();
    expect(screen.getByText("Bicycling")).toBeInTheDocument();
  });

  it("shows a checkmark next to the active mode in the dropdown", () => {
    render(<DayTransportMode dayNumber={1} mode="walking" onSave={onSave} />);
    openDropdown();
    // The Walking dropdown option (index > 0) should have the active class
    const allButtons = screen.getAllByRole("button");
    const walkingOption = allButtons.find((b, i) => i > 0 && b.textContent?.includes("Walking"));
    expect(walkingOption?.className).toMatch(/text-primary/);
  });

  it("calls onSave with correct dayNumber and mode when a dropdown option is clicked", async () => {
    render(<DayTransportMode dayNumber={2} mode={undefined} onSave={onSave} />);
    openDropdown();
    clickDropdownOption("Driving");
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
      expect(onSave).toHaveBeenCalledWith(2, "driving");
    });
  });

  it("closes the dropdown after selecting a mode", async () => {
    render(<DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} />);
    openDropdown();
    clickDropdownOption("Driving");
    await waitFor(() => {
      expect(screen.queryByText("Transit")).not.toBeInTheDocument();
    });
  });

  it("does not call onSave when clicking the already-active mode", async () => {
    render(<DayTransportMode dayNumber={1} mode="transit" onSave={onSave} />);
    openDropdown();
    clickDropdownOption("Transit");
    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  it("shows apply-all option in dropdown when onApplyAll and mode are provided", () => {
    render(
      <DayTransportMode dayNumber={1} mode="driving" onSave={onSave} onApplyAll={onApplyAll} />,
    );
    openDropdown();
    expect(screen.getByText("Apply Driving to all days")).toBeInTheDocument();
  });

  it("does not show apply-all option when mode is undefined", () => {
    render(
      <DayTransportMode dayNumber={1} mode={undefined} onSave={onSave} onApplyAll={onApplyAll} />,
    );
    openDropdown();
    expect(screen.queryByText(/Apply.*to all days/)).not.toBeInTheDocument();
  });

  it("calls onApplyAll with the current mode when apply-all option is clicked", async () => {
    render(
      <DayTransportMode dayNumber={1} mode="bicycling" onSave={onSave} onApplyAll={onApplyAll} />,
    );
    openDropdown();
    clickDropdownOption("Apply Bicycling to all days");
    await waitFor(() => {
      expect(onApplyAll).toHaveBeenCalledOnce();
      expect(onApplyAll).toHaveBeenCalledWith("bicycling");
    });
  });

  it("disables trigger button when onSave is not provided", () => {
    render(<DayTransportMode dayNumber={1} mode="driving" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not open dropdown when not editable", () => {
    render(<DayTransportMode dayNumber={1} mode="driving" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("Walking")).not.toBeInTheDocument();
  });
});
