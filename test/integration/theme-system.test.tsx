import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

describe("Theme System Integration Tests", () => {
  const THEME_STORAGE_KEY = "tripai:theme";

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  // Test component that displays current theme
  function ThemeDisplay() {
    const { theme, resolvedTheme } = useTheme();
    return (
      <div>
        <div data-testid="theme">{theme}</div>
        <div data-testid="resolved-theme">{resolvedTheme}</div>
      </div>
    );
  }

  it("should initialize with system theme by default", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("should load saved theme from localStorage on mount", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });
  });

  it("should apply theme class to document root", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole("button");

    // Click once to set to light
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    // Click again to set to dark
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("should persist theme changes to localStorage", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole("button");

    // Click to change theme
    fireEvent.click(toggleButton);

    await waitFor(() => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      expect(stored).toBeTruthy();
      expect(["light", "dark", "system"]).toContain(stored);
    });
  });

  it("should cycle through themes: light -> dark -> system -> light", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = screen.getByRole("button");

    // Start with system, click to get light
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light");
    });

    // Click to get dark
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("dark");
    });

    // Click to get system
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("system");
    });

    // Click to get light again
    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(screen.getByTestId("theme").textContent).toBe("light");
    });
  });

  it("should handle invalid stored theme gracefully", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid-theme");

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    // Should fall back to system theme
    expect(screen.getByTestId("theme").textContent).toBe("system");
  });

  it("should throw error when useTheme is used outside ThemeProvider", () => {
    expect(() => {
      render(<ThemeDisplay />);
    }).toThrow("useTheme must be used within a ThemeProvider");
  });
});
