import {
  browserStorage,
  systemClock,
  type Clock,
  type StorageLike,
} from "$lib/utils/runtime-deps";

/**
 * Per-browser usage limit for the Idea Developer (#3228).
 *
 * A courtesy and cost guard that sits on top of the enforceable limits (the
 * bot check and the edge rate limiters). It keeps timestamps only — no text and
 * no identifier — and fails open if storage is unavailable, leaving the edge
 * limits to apply.
 */
export const USAGE_STORAGE_KEY = "idea-developer-usage";
export const USAGE_COOLDOWN_MS = 10_000;
export const USAGE_PERIOD_MS = 60 * 60 * 1000;
export const USAGE_MAX_PER_PERIOD = 20;

export type UsageCheck =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "period"; retryAt: number };

interface UsageWindow {
  version: 1;
  timestamps: number[];
}

export class IdeaDeveloperUsageLimiter {
  constructor(
    private readonly storage: StorageLike = browserStorage,
    private readonly clock: Clock = systemClock,
  ) {}

  /** Whether a turn may be sent now. Does not record anything. */
  check(): UsageCheck {
    const now = this.clock.now();
    const timestamps = this.read(now);
    if (timestamps.length === 0) return { allowed: true };

    const last = timestamps[timestamps.length - 1];
    if (now - last < USAGE_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: "cooldown",
        retryAt: last + USAGE_COOLDOWN_MS,
      };
    }
    if (timestamps.length >= USAGE_MAX_PER_PERIOD) {
      return {
        allowed: false,
        reason: "period",
        retryAt: timestamps[0] + USAGE_PERIOD_MS,
      };
    }
    return { allowed: true };
  }

  /** Records that a turn was sent. */
  record(): void {
    const now = this.clock.now();
    const timestamps = this.read(now);
    timestamps.push(now);
    try {
      const value: UsageWindow = { version: 1, timestamps };
      this.storage.setItem(USAGE_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Fail open: the edge limits still apply.
    }
  }

  private read(now: number): number[] {
    try {
      const raw = this.storage.getItem(USAGE_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Partial<UsageWindow>;
      if (parsed?.version !== 1 || !Array.isArray(parsed.timestamps)) return [];
      return parsed.timestamps
        .filter((t): t is number => typeof t === "number")
        .filter((t) => now - t < USAGE_PERIOD_MS)
        .sort((a, b) => a - b);
    } catch {
      return [];
    }
  }
}

export const ideaDeveloperUsageLimiter = new IdeaDeveloperUsageLimiter();
