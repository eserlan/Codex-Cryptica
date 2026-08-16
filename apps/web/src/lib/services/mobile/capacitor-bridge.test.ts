import { describe, it, expect, vi, beforeEach } from "vitest";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { CapacitorBridge, type NativeRouter } from "./capacitor-bridge";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

vi.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setStyle: vi.fn(),
    setOverlaysWebView: vi.fn(),
  },
  Style: {
    Dark: "DARK",
    Light: "LIGHT",
    Default: "DEFAULT",
  },
}));

describe("CapacitorBridge", () => {
  let routerMock: ReturnType<typeof vi.fn<NativeRouter>>;
  let bridge: CapacitorBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    routerMock = vi.fn<NativeRouter>();
    bridge = new CapacitorBridge((path: string) => routerMock(path));
  });

  it("reports web platform when running in browser", () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("web");

    expect(bridge.isNative()).toBe(false);
    expect(bridge.getPlatform()).toBe("web");
  });

  it("skips native listener attachment on web during init", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    await bridge.init();

    expect(StatusBar.setStyle).not.toHaveBeenCalled();
    expect(CapApp.addListener).not.toHaveBeenCalled();
  });

  it("attaches listeners and configures status bar on native platform", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");

    await bridge.init();

    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
    expect(StatusBar.setOverlaysWebView).toHaveBeenCalledWith({
      overlay: true,
    });
    expect(CapApp.addListener).toHaveBeenCalledWith(
      "appUrlOpen",
      expect.any(Function),
    );
    expect(CapApp.addListener).toHaveBeenCalledWith(
      "backButton",
      expect.any(Function),
    );
  });

  it("dispatches parsed paths to router on appUrlOpen", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const listeners: Record<string, (args: any) => void> = {};
    vi.mocked(CapApp.addListener).mockImplementation(
      (eventName: string, listener: any) => {
        listeners[eventName] = listener;
        return Promise.resolve({ remove: vi.fn() }) as any;
      },
    );

    await bridge.init();

    // Trigger appUrlOpen with valid URL
    listeners["appUrlOpen"]?.({
      url: "https://codexcryptica.com/generators/npc?genre=fantasy#top",
    });

    expect(routerMock).toHaveBeenCalledWith(
      "/generators/npc?genre=fantasy#top",
    );
  });

  it("handles invalid or non-URL string in appUrlOpen gracefully without throwing", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const listeners: Record<string, (args: any) => void> = {};
    vi.mocked(CapApp.addListener).mockImplementation(
      (eventName: string, listener: any) => {
        listeners[eventName] = listener;
        return Promise.resolve({ remove: vi.fn() }) as any;
      },
    );

    await bridge.init();

    expect(() => {
      listeners["appUrlOpen"]?.({ url: "not-a-valid-url" });
    }).not.toThrow();
    expect(routerMock).not.toHaveBeenCalled();
  });

  it("handles backButton event properly when canGoBack is false", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const listeners: Record<string, (args: any) => void> = {};
    vi.mocked(CapApp.addListener).mockImplementation(
      (eventName: string, listener: any) => {
        listeners[eventName] = listener;
        return Promise.resolve({ remove: vi.fn() }) as any;
      },
    );

    await bridge.init();

    listeners["backButton"]?.({ canGoBack: false });
    expect(CapApp.exitApp).toHaveBeenCalled();
  });
});
