import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { OnboardingStore } from "./onboarding.svelte";
import { UIPersistence } from "./persistence";

describe("OnboardingStore", () => {
  it("initializes with default values when persistence is empty", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence);

    expect(store.skipWelcomeScreen).toBe(false);
    expect(store.dismissedLandingPage).toBe(false);
    expect(store.dismissedWorldPage).toBe(false);
    expect(store.worldPageDismissedAt).toBeNull();
    expect(store.lastSeenVersion).toBeNull();
    expect(store.isLandingPageVisible).toBe(true);
  });

  it("initializes from persistence", () => {
    const mockGetNow = () => 12345 + 1000; // 1 second after dismissal

    const mockStorage = {
      getItem: vi.fn((key: string) => {
        if (key === "codex_skip_landing") return "true";
        if (key === "codex_dismissed_landing") return "true";
        if (key === "codex_world_page_dismissed_at") return "12345";
        if (key === "codex_last_seen_version") return "v1.0.0";
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence, mockGetNow);

    expect(store.skipWelcomeScreen).toBe(true);
    expect(store.dismissedLandingPage).toBe(true);
    expect(store.dismissedWorldPage).toBe(true);
    expect(store.worldPageDismissedAt).toBe(12345);
    expect(store.lastSeenVersion).toBe("v1.0.0");
    expect(store.isLandingPageVisible).toBe(false);
  });

  it("markVersionAsSeen updates state and persists", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence);

    store.markVersionAsSeen("v1.1.0");
    expect(store.lastSeenVersion).toBe("v1.1.0");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_last_seen_version",
      "v1.1.0",
    );
  });

  it("toggleWelcomeScreen updates state and persists", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence);

    store.toggleWelcomeScreen(true);
    expect(store.skipWelcomeScreen).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_skip_landing",
      "true",
    );
  });

  it("dismissLandingPage updates state and persists", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence);

    store.dismissLandingPage();
    expect(store.dismissedLandingPage).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_dismissed_landing",
      "true",
    );
  });

  it("dismissWorldPage and restoreWorldPage work correctly", () => {
    const mockGetNow = () => 100000;

    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new OnboardingStore(persistence, mockGetNow);

    store.dismissWorldPage();
    expect(store.dismissedWorldPage).toBe(true);
    expect(store.worldPageDismissedAt).toBeTypeOf("number");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_world_page_dismissed_at",
      expect.any(String),
    );

    store.restoreWorldPage();
    expect(store.dismissedWorldPage).toBe(false);
    expect(store.worldPageDismissedAt).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(
      "codex_world_page_dismissed_at",
    );
  });
});
