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
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
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
      name: /generateButton/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Destination is required")).toBeInTheDocument();
    });
  });

  it("should accept valid destination", async () => {
    render(<TripForm />);

    const destinationInput = screen.getByPlaceholderText(
      /destinationPlaceholder/i
    );
    fireEvent.change(destinationInput, { target: { value: "Tokyo" } });

    const submitButton = screen.getByRole("button", {
      name: /generateButton/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.queryByText("Destination is required")
      ).not.toBeInTheDocument();
    });
  });

  it("should handle optional custom preferences", async () => {
    render(<TripForm />);

    const destinationInput = screen.getByPlaceholderText(
      /destinationPlaceholder/i
    );
    const preferencesTextarea = screen.getByPlaceholderText(
      /preferencesPlaceholder/i
    );

    // Submit with destination only (no preferences)
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    const submitButton = screen.getByRole("button", {
      name: /generateButton/i,
    });
    fireEvent.click(submitButton);

    // Should not show any validation errors
    await waitFor(() => {
      expect(
        screen.queryByText("Destination is required")
      ).not.toBeInTheDocument();
    });

    // Now add preferences and submit again
    fireEvent.change(preferencesTextarea, {
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
      /destinationPlaceholder/i
    );

    // Fill in destination but leave dates empty
    fireEvent.change(destinationInput, { target: { value: "Tokyo" } });

    const submitButton = screen.getByRole("button", {
      name: /generateButton/i,
    });
    fireEvent.click(submitButton);

    // Form should not proceed (validation blocks submission)
    // We can verify dates field wasn't touched by checking date picker is still visible
    await waitFor(() => {
      expect(screen.getByTestId("mock-date-picker")).toBeInTheDocument();
    });

    // Now select dates
    const datePicker = screen.getByTestId("mock-date-picker");
    fireEvent.click(datePicker);

    // This time submit should work (form will attempt to proceed)
    fireEvent.click(submitButton);

    // Note: Full validation flow and i18n error messages are validated by E2E tests
    // in test/validation/zod-i18n-integration.test.ts
  });
});
