import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditsBadge } from "@/components/ui/credits-badge";

const mockUseProfile = vi.fn();
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => mockUseProfile(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = { credits: "credits" };
    return map[key] ?? key;
  },
}));

describe("CreditsBadge", () => {
  it("should display the user's credit count", () => {
    mockUseProfile.mockReturnValue({ credits: 500 });

    render(<CreditsBadge />);

    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("credits")).toBeInTheDocument();
  });

  it("should display zero credits", () => {
    mockUseProfile.mockReturnValue({ credits: 0 });

    render(<CreditsBadge />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should use tabular-nums for stable number width", () => {
    mockUseProfile.mockReturnValue({ credits: 1234 });

    render(<CreditsBadge />);

    const creditNumber = screen.getByText("1234");
    expect(creditNumber.className).toContain("tabular-nums");
  });
});
