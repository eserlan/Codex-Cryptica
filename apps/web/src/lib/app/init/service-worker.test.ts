import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "$app/paths";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { collectVaultShellUrls, registerServiceWorker } from "./service-worker";

vi.mock("$app/env", () => ({ browser: true }));
vi.mock("$app/paths", () => ({
  resolve: vi.fn((path: string) => (path === "/(app)" ? "/" : path)),
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolve).mockImplementation((path) =>
    path === "/(app)" ? "/" : path,
  );
});

describe("registerServiceWorker", () => {
  it("collects only the current document and same-origin immutable assets", () => {
    expect(
      collectVaultShellUrls(
        "https://codex.test/vault/world-1?view=graph#entity",
        [
          { name: "https://codex.test/_app/immutable/app.js" },
          { name: "https://codex.test/api/entities" },
          { name: "https://cdn.test/_app/immutable/vendor.js" },
        ],
      ),
    ).toEqual([
      "https://codex.test/vault/world-1?view=graph",
      "https://codex.test/_app/immutable/app.js",
    ]);
  });

  it("returns no shell URLs for an invalid document URL", () => {
    expect(collectVaultShellUrls("not a url", [])).toEqual([]);
  });

  it("should not register if in DEV mode (default in Vitest)", async () => {
    const registerSpy = vi.fn();
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          register: registerSpy,
        },
      } as any,
      window: mockWindow,
      isDev: true,
    });

    expect(registerSpy).not.toHaveBeenCalled();
  });

  it("should register immediately when the document is active", () => {
    const registerSpy = vi.fn().mockResolvedValue(undefined);
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          register: registerSpy,
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    expect(registerSpy).toHaveBeenCalledWith("/service-worker.js");
  });

  it("registers the service worker beneath a configured base path", () => {
    vi.mocked(resolve).mockImplementation((path) =>
      path === "/(app)" ? "/preview/" : path,
    );
    const registerSpy = vi.fn().mockResolvedValue(undefined);
    registerServiceWorker({
      document: {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      navigator: { serviceWorker: { register: registerSpy } } as any,
      window: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      isDev: false,
    });

    expect(registerSpy).toHaveBeenCalledWith("/preview/service-worker.js");
  });

  it("seeds the loaded vault shell only after the session becomes active", async () => {
    const postMessage = vi.fn();
    const registerSpy = vi.fn().mockResolvedValue({
      active: { postMessage },
      update: vi.fn().mockResolvedValue(undefined),
    });

    const session = registerServiceWorker({
      document: {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      navigator: {
        serviceWorker: {
          controller: null,
          register: registerSpy,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      } as any,
      window: {
        location: {
          href: "https://codex.test/vault/world-1#entity",
          reload: vi.fn(),
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      performance: {
        getEntriesByType: vi.fn(
          () =>
            [
              { name: "https://codex.test/_app/immutable/app.js" },
              { name: "https://codex.test/blog/post" },
            ] as PerformanceEntry[],
        ),
      },
      isDev: false,
    });

    session.setVaultSessionActive(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({
      type: "VAULT_CACHE_SESSION",
      active: true,
      urls: [
        "https://codex.test/vault/world-1",
        "https://codex.test/_app/immutable/app.js",
      ],
    });
  });

  it("should prompt user and reload once when a new worker takes control and user confirms", async () => {
    const registerSpy = vi.fn().mockResolvedValue(undefined);
    const serviceWorkerListeners = new Map<string, EventListener>();
    const reloadSpy = vi.fn();
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      location: { reload: reloadSpy },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const confirmSpy = vi
      .spyOn(notificationStore, "confirm")
      .mockResolvedValue(true);

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          controller: {},
          register: registerSpy,
          addEventListener: vi.fn((event: string, handler: EventListener) => {
            serviceWorkerListeners.set(event, handler);
          }),
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    const controllerChange = serviceWorkerListeners.get("controllerchange");
    expect(controllerChange).toBeDefined();

    controllerChange?.(new Event("controllerchange"));
    controllerChange?.(new Event("controllerchange"));

    await Promise.resolve();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "App Update Available",
        confirmLabel: "Reload Now",
        cancelLabel: "Not Now",
      }),
    );
    expect(reloadSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it("should not reload when the user cancels the update prompt", async () => {
    const registerSpy = vi.fn().mockResolvedValue(undefined);
    const serviceWorkerListeners = new Map<string, EventListener>();
    const reloadSpy = vi.fn();
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      location: { reload: reloadSpy },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    const confirmSpy = vi
      .spyOn(notificationStore, "confirm")
      .mockResolvedValue(false);

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          controller: {},
          register: registerSpy,
          addEventListener: vi.fn((event: string, handler: EventListener) => {
            serviceWorkerListeners.set(event, handler);
          }),
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    const controllerChange = serviceWorkerListeners.get("controllerchange");
    expect(controllerChange).toBeDefined();

    controllerChange?.(new Event("controllerchange"));

    await Promise.resolve();
    await Promise.resolve();

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(reloadSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("should not reload when the first worker takes control", () => {
    const serviceWorkerListeners = new Map<string, EventListener>();
    const reloadSpy = vi.fn();
    const serviceWorker = {
      controller: null as ServiceWorker | null,
      register: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        serviceWorkerListeners.set(event, handler);
      }),
    };

    registerServiceWorker({
      document: {
        readyState: "complete",
        visibilityState: "visible",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      navigator: { serviceWorker } as any,
      window: {
        location: { reload: reloadSpy },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      isDev: false,
    });

    serviceWorker.controller = {} as ServiceWorker;
    serviceWorkerListeners.get("controllerchange")?.(
      new Event("controllerchange"),
    );

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("should defer registration until the document becomes active", () => {
    const registerSpy = vi.fn().mockResolvedValue(undefined);
    const docListeners = new Map<string, EventListener>();
    const windowListeners = new Map<string, EventListener>();
    const mockDocument = {
      readyState: "loading",
      visibilityState: "hidden",
      prerendering: true,
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        docListeners.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string) => {
        docListeners.delete(event);
      }),
    } as any;
    const mockWindow = {
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        windowListeners.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string) => {
        windowListeners.delete(event);
      }),
    } as any;

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          register: registerSpy,
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    expect(registerSpy).not.toHaveBeenCalled();

    mockDocument.readyState = "complete";
    mockDocument.visibilityState = "visible";
    mockDocument.prerendering = false;
    const visibilityHandler = docListeners.get("visibilitychange");

    expect(visibilityHandler).toBeDefined();
    visibilityHandler?.(new Event("visibilitychange"));

    expect(registerSpy).toHaveBeenCalledWith("/service-worker.js");
    expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
      "pageshow",
      expect.any(Function),
    );
  });

  it("should handle registration failure", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registerSpy = vi
      .fn()
      .mockRejectedValue(new Error("Service worker failed"));
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          register: registerSpy,
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      "Service Worker registration failed:",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("should silently ignore InvalidStateError during registration", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = new Error(
      "Failed to register a ServiceWorker: The document is in an invalid state.",
    );
    error.name = "InvalidStateError";
    const registerSpy = vi.fn().mockRejectedValue(error);
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: {
          register: registerSpy,
        },
      } as any,
      window: mockWindow,
      isDev: false,
    });

    await Promise.resolve();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  /**
   * Builds a registered worker plus the visibilitychange handler the
   * registration installs, with a clock the test drives by hand.
   */
  async function setupUpdateChecks(startTime = 1_000_000) {
    const update = vi.fn().mockResolvedValue(undefined);
    const visibilityHandlers: EventListener[] = [];
    const mockDocument = {
      readyState: "complete",
      visibilityState: "visible",
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === "visibilitychange") visibilityHandlers.push(handler);
      }),
      removeEventListener: vi.fn(),
    } as any;
    const clock = { now: startTime };

    registerServiceWorker({
      document: mockDocument,
      navigator: {
        serviceWorker: { register: vi.fn().mockResolvedValue({ update }) },
      } as any,
      window: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any,
      isDev: false,
      now: () => clock.now,
    });

    await Promise.resolve();

    const onVisible = visibilityHandlers.at(-1);
    expect(onVisible).toBeDefined();
    return { update, clock, mockDocument, onVisible: onVisible! };
  }

  it("should check for an update once on registration", async () => {
    const { update } = await setupUpdateChecks();

    expect(update).toHaveBeenCalledTimes(1);
  });

  it("should throttle update checks when the tab is refocused rapidly", async () => {
    const { update, clock, onVisible } = await setupUpdateChecks();

    clock.now += 60_000;
    onVisible(new Event("visibilitychange"));
    clock.now += 60_000;
    onVisible(new Event("visibilitychange"));

    // Still just the check from registration itself.
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("should check again once the throttle interval has elapsed", async () => {
    const { update, clock, onVisible } = await setupUpdateChecks();

    clock.now += 15 * 60 * 1000;
    onVisible(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(2);

    // That check restarts the window rather than leaving it open.
    clock.now += 60_000;
    onVisible(new Event("visibilitychange"));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("should not check for updates when the tab becomes hidden", async () => {
    const { update, clock, mockDocument, onVisible } =
      await setupUpdateChecks();

    mockDocument.visibilityState = "hidden";
    clock.now += 60 * 60 * 1000;
    onVisible(new Event("visibilitychange"));

    expect(update).toHaveBeenCalledTimes(1);
  });
});
