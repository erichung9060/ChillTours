import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "@/components/layout/header";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-123",
      email: "test@example.com",
      user_metadata: { full_name: "Test User", avatar_url: null },
    },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ credits: 500, tier: "free" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/ui/logo", () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock("@/components/ui/language-selector", () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock("@/components/auth/login-dialog", () => ({
  LoginDialog: () => null,
}));

describe("Header with CreditsBadge", () => {
  it("should display credits when user is logged in", () => {
    render(<Header />);
    expect(screen.getByText("500")).toBeInTheDocument();
  });
});
