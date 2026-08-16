import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { goto } from "$app/navigation";

export interface NativeRouter {
  (path: string): Promise<void> | void;
}

export class CapacitorBridge {
  private initialized = false;
  private readonly router: NativeRouter;

  constructor(
    router: NativeRouter = (path: string) => {
      void goto(path);
    },
  ) {
    this.router = router;
  }

  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  getPlatform(): "android" | "ios" | "web" {
    return Capacitor.getPlatform() as "android" | "ios" | "web";
  }

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    if (!this.isNative()) {
      return;
    }

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (_err) {
      // Non-critical on unsupported webviews / desktop platforms
    }

    CapApp.addListener("appUrlOpen", (event) => {
      try {
        const url = new URL(event.url);
        const path = url.pathname + url.search + url.hash;
        if (path) {
          void this.router(path);
        }
      } catch (_err) {
        // Ignore invalid URLs
      }
    });

    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void CapApp.exitApp();
      }
    });
  }

  resetForTesting(): void {
    this.initialized = false;
  }
}

export const capacitorBridge = new CapacitorBridge();
