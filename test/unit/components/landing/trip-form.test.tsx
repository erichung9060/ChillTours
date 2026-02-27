import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TripForm } from "@/components/landing/trip-form";

// Mock auth context
vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock DateRangePicker
vi.mock("@/components/landing/date-range-picker", () => ({
  DateRangePicker: ({
    onChange,
  }: {
    onChange: (start: Date, end: Date) => void;
  }) => (
    <button
      type="button"
      data-testid="mock-date-picker"
      onClick={() => onChange(new Date("2024-05-20"), new Date("2024-05-25"))}
    >
      Mock Select Dates
    </button>
  ),
}));

describe("TripForm - Form Validation", () => {
  it("should reject empty destination", async () => {
    render(<TripForm />);

    const submitButton = screen.getByRole("button", {
      name: /generate free itinerary/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Destination is required")).toBeInTheDocument();
    });
  });

  it("should accept valid destination", async () => {
    render(<TripForm />);

    const destinationInput = screen.getByPlaceholderText(
      /e.g. Tokyo, Bali, Paris/i
    );
    fireEvent.change(destinationInput, { target: { value: "Tokyo" } });

    const submitButton = screen.getByRole("button", {
      name: /generate free itinerary/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Destination is required")
      ).not.toBeInTheDocument();
    });
  });

  it("should handle optional custom requirements", async () => {
    render(<TripForm />);

    const destinationInput = screen.getByPlaceholderText(
      /e.g. Tokyo, Bali, Paris/i
    );
    const vibeTextarea = screen.getByPlaceholderText(
      /Budget-friendly foodie tour/i
    );

    // Submit with destination only (no vibe)
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    const submitButton = screen.getByRole("button", {
      name: /generate free itinerary/i,
    });
    fireEvent.click(submitButton);

    // Should not show any validation errors
    await waitFor(() => {
      expect(
        screen.queryByText("Destination is required")
      ).not.toBeInTheDocument();
    });

    // Now add vibe and submit again
    fireEvent.change(vibeTextarea, {
      target: { value: "Budget-friendly foodie tour" },
    });
    fireEvent.click(submitButton);

    // Should still not show validation errors
    await waitFor(() => {
      expect(
        screen.queryByText("Destination is required")
      ).not.toBeInTheDocument();
    });
  });

  it("should validate date selection", async () => {
    render(<TripForm />);

    const destinationInput = screen.getByPlaceholderText(
      /e.g. Tokyo, Bali, Paris/i
    );

    // Test that valid destination but missing dates shows error
    fireEvent.change(destinationInput, { target: { value: "Tokyo" } });

    const submitButton = screen.getByRole("button", {
      name: /generate free itinerary/i,
    });
    fireEvent.click(submitButton);

    // Should show date validation error
    await waitFor(() => {
      expect(
        screen.getByText("Please select your travel dates")
      ).toBeInTheDocument();
    });

    // Test that selecting dates clears error (or allows submission)
    const datePicker = screen.getByTestId("mock-date-picker");
    fireEvent.click(datePicker);

    // Clicking submit again (technically error should clear on selection or next submit)
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Please select your travel dates")
      ).not.toBeInTheDocument();
    });
  });
});
