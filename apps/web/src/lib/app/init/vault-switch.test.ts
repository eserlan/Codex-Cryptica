import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerVaultSwitchListener } from "./vault-switch";
import { calendarStore } from "#lib/stores/calendar.svelte.js";
import { timelineStore } from "#lib/stores/timeline.svelte.js";
import { systemProfileStore } from "#lib/stores/system-profile.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { activeVaultId: "vault-7" },
}));
vi.mock("#lib/stores/calendar.svelte.js", () => ({
  calendarStore: { init: vi.fn() },
}));
vi.mock("#lib/stores/timeline.svelte.js", () => ({
  timelineStore: { init: vi.fn(), resetVaultGuard: vi.fn() },
}));
vi.mock("#lib/stores/system-profile.svelte.js", () => ({
  systemProfileStore: { init: vi.fn() },
}));

let cleanup: () => void;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  cleanup = registerVaultSwitchListener();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("vault switch initialization", () => {
  it("reads the current vault and awaits the calendar before resetting the timeline", async () => {
    let finishCalendar!: () => void;
    vi.mocked(calendarStore.init).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishCalendar = resolve;
        }),
    );
    window.dispatchEvent(new Event("vault-switched"));
    await vi.waitFor(() => expect(calendarStore.init).toHaveBeenCalledOnce());
    expect(systemProfileStore.init).toHaveBeenCalledWith(vault.activeVaultId);
    expect(timelineStore.resetVaultGuard).not.toHaveBeenCalled();
    finishCalendar();
    await vi.waitFor(() => expect(timelineStore.init).toHaveBeenCalledOnce());
    expect(timelineStore.resetVaultGuard).toHaveBeenCalledBefore(
      vi.mocked(timelineStore.init),
    );
  });

  it("continues calendar initialization if the profile fails", async () => {
    const error = new Error("profile unavailable");
    vi.mocked(systemProfileStore.init).mockRejectedValueOnce(error);
    window.dispatchEvent(new Event("vault-switched"));
    await vi.waitFor(() => expect(timelineStore.init).toHaveBeenCalledOnce());
    expect(console.error).toHaveBeenCalledWith(
      "[AppInit] Failed to load the vault's game system profile:",
      error,
    );
  });

  it("reports a calendar failure without initializing the timeline", async () => {
    const error = new Error("calendar unavailable");
    vi.mocked(calendarStore.init).mockRejectedValueOnce(error);
    window.dispatchEvent(new Event("vault-switched"));
    await vi.waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "[AppInit] Failed to initialize calendar store on vault switch:",
        error,
      ),
    );
    expect(timelineStore.init).not.toHaveBeenCalled();
    expect(timelineStore.resetVaultGuard).not.toHaveBeenCalled();
  });

  it("stops responding after cleanup", async () => {
    cleanup();
    window.dispatchEvent(new Event("vault-switched"));
    await Promise.resolve();
    expect(calendarStore.init).not.toHaveBeenCalled();
    expect(systemProfileStore.init).not.toHaveBeenCalled();
  });
});
