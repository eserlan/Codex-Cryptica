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

  describe("goal invitation (spec 175)", () => {
    const storeWith = (
      values: Record<string, string> = {},
      failWrites = false,
    ) => {
      const storage = {
        getItem: vi.fn((key: string) => values[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          if (failWrites) throw new Error("quota");
          values[key] = value;
        }),
        removeItem: vi.fn(),
      };
      return {
        store: new OnboardingStore(new UIPersistence({ storage })),
        storage,
        values,
      };
    };

    it("defaults to unanswered with no goal and no guidance showing", () => {
      const { store } = storeWith();
      expect(store.goalInvitation).toBeNull();
      expect(store.chosenGoal).toBeNull();
      expect(store.firstRunGuidanceActive).toBe(false);
    });

    it("persists the answer and the goal", () => {
      const { store, values } = storeWith();
      store.resolveGoalInvitation("goal");
      store.chooseGoal("story");
      expect(values).toEqual({
        codex_goal_invitation: "goal",
        codex_chosen_goal: "story",
      });
      const again = storeWith(values).store;
      expect(again.goalInvitation).toBe("goal");
      expect(again.chosenGoal).toBe("story");
    });

    it("reads invalid stored values as unanswered", () => {
      const { store } = storeWith({
        codex_goal_invitation: "maybe",
        codex_chosen_goal: "explore",
      });
      expect(store.goalInvitation).toBeNull();
      expect(store.chosenGoal).toBeNull();
    });

    it("keeps the answer in memory when storage fails", () => {
      const { store } = storeWith({}, true);
      store.resolveGoalInvitation("dismissed");
      expect(store.goalInvitation).toBe("dismissed");
    });

    it("never writes the guidance flag to storage", () => {
      const { store, storage } = storeWith();
      store.firstRunGuidanceActive = true;
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });
});
