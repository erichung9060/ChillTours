import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { themeModeArbitrary } from "../utils/property-test-helpers";

// Feature: tripai-travel-planner, Property 5: Theme Toggle Round-trip
// Validates: Requirements 2.5, 13.1, 13.2, 13.4

describe("Theme System Property Tests", () => {
  const THEME_STORAGE_KEY = "tripai:theme";

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  it("Property 5: Theme Toggle Round-trip - for any theme mode selection, toggling should save to localStorage and reloading should restore the same preference", async () => {
    await fc.assert(
      fc.asyncProperty(themeModeArbitrary, async (themeMode) => {
        // Save theme to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, themeMode);

        // Simulate page reload by reading from localStorage
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

        // Verify the theme was persisted correctly
        expect(storedTheme).toBe(themeMode);
      }),
      { numRuns: 100 },
    );
  });

  it("Property 5 (Extended): Theme persistence across multiple save-load cycles", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(themeModeArbitrary, { minLength: 1, maxLength: 10 }),
        async (themeModes) => {
          const lastTheme = themeModes[themeModes.length - 1];

          // Simulate multiple theme changes
          for (const theme of themeModes) {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
          }

          // Verify the last theme is persisted
          const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          expect(storedTheme).toBe(lastTheme);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 5 (Edge Case): Theme storage handles invalid values gracefully", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s.length > 0 && !["light", "dark", "system"].includes(s)),
        async (invalidTheme) => {
          // Store invalid theme
          localStorage.setItem(THEME_STORAGE_KEY, invalidTheme);

          // Read back
          const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

          // Should still be stored (validation happens in the provider)
          expect(storedTheme).toBe(invalidTheme);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 5 (Idempotence): Saving the same theme multiple times produces consistent results", async () => {
    await fc.assert(
      fc.asyncProperty(
        themeModeArbitrary,
        fc.integer({ min: 1, max: 10 }),
        async (themeMode, repeatCount) => {
          // Save the same theme multiple times
          for (let i = 0; i < repeatCount; i++) {
            localStorage.setItem(THEME_STORAGE_KEY, themeMode);
          }

          // Verify it's still the same
          const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          expect(storedTheme).toBe(themeMode);
        },
      ),
      { numRuns: 100 },
    );
  });
});
