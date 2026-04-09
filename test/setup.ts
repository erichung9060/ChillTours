import "@testing-library/jest-dom";
import { expect, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock matchMedia for theme tests
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });

  // Mock localStorage with proper implementation
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  // Also set global.localStorage for non-browser contexts
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

// Custom matchers from jest-dom
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

// Mock next-intl globally
vi.mock("next-intl", () => {
  // Simple translation map for common test keys
  const translations: Record<string, string> = {
    // Validation messages
    "validation.destinationRequired": "Destination is required",
    "validation.startDateRequired": "Start date is required",
    "validation.endDateRequired": "End date is required",
    "validation.datesRequired": "Dates are required",
    "validation.bothDatesRequired": "Please select both start and end dates",
    "validation.endDateAfterStart": "End date must be on or after start date",
  };

  return {
    useTranslations: () => (key: string) => translations[key] || key,
    useLocale: () => "en",
    useTimeZone: () => "UTC",
    useMessages: () => ({}),
    useNow: () => new Date(),
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});
// Mock next-intl/navigation if needed
vi.mock("next-intl/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "",
  createSharedPathnamesNavigation: () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "",
  }),
  createNavigation: () => ({
    Link: ({ children }: { children: React.ReactNode }) => children,
    redirect: vi.fn(),
    usePathname: () => "",
    useRouter: () => ({ push: vi.fn() }),
    getPathname: vi.fn(),
  }),
}));
