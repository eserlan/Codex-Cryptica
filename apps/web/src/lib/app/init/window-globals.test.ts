import { afterEach, describe, expect, it, vi } from "vitest";
import { setupWindowGlobals } from "./window-globals";

vi.mock("$app/env", () => ({ browser: true }));
vi.mock("../../stores/debug.svelte", () => ({
  debugStore: { log: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../services/RevisionService.svelte", () => ({}));
vi.mock("../../services/generators/generator-session-manager", () => ({}));
vi.mock("@codex/ai-engine", () => ({}));
vi.mock("../../cloud-bridge/p2p/host-service.svelte", () => ({}));
vi.mock("../../cloud-bridge/p2p/guest-service", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(window, "uiStore");
  Reflect.deleteProperty(window, "codexUI");
});

function attach(context: Record<string, unknown>) {
  setupWindowGlobals(context as Parameters<typeof setupWindowGlobals>[0]);
  return (window as any).uiStore;
}

describe("window globals", () => {
  it.each([
    ["onboardingStore", "showChangelog"],
    ["sessionModeStore", "guestUsername"],
    ["layoutUIStore", "leftSidebarWidth"],
    ["modalUIStore", "zenModeEntityId"],
    ["discoveryPolicyStore", "acknowledgedUnindexed"],
    ["connectionModeStore", "connectionMode"],
    ["explorerUIStore", "selectedLabels"],
  ])("forwards reads and writes to %s", (name, prop) => {
    const store = { [prop]: "initial" };
    const proxy = attach({ [name]: store });
    expect(proxy[prop]).toBe("initial");
    expect(Reflect.set(proxy, prop, "changed")).toBe(true);
    expect(store[prop]).toBe("changed");
  });

  it.each([
    ["sessionModeStore", "setGuestUsername"],
    ["layoutUIStore", "findInGraph"],
    ["modalUIStore", "openZenMode"],
  ])("binds methods to %s and rejects replacing them", (name, method) => {
    const store = {
      [method](this: unknown) {
        return this;
      },
    };
    const proxy = attach({ [name]: store });
    expect(proxy[method]()).toBe(store);
    expect(Reflect.set(proxy, method, vi.fn())).toBe(false);
  });

  it("keeps onboarding function values unbound", () => {
    const showChangelog = vi.fn();
    const proxy = attach({ onboardingStore: { showChangelog } });
    expect(proxy.showChangelog).toBe(showChangelog);
  });

  it("rejects unknown, symbol and absent-store writes", () => {
    const proxy = attach({});
    for (const prop of ["unknown", Symbol.iterator, "showChangelog"]) {
      expect(Reflect.get(proxy, prop)).toBeUndefined();
      expect(Reflect.set(proxy, prop, true)).toBe(false);
    }
  });

  it("does not attach debug globals in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_STAGING", "false");
    attach({});
    expect((window as any).uiStore).toBeUndefined();
  });

  it("attaches the named UI stores in staging", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_STAGING", "true");
    const modalUIStore = {};
    attach({ modalUIStore });
    expect((window as any).codexUI.modal).toBe(modalUIStore);
  });
});
