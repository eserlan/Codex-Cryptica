import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const appHtml = fs.readFileSync(path.resolve(__dirname, "app.html"), "utf-8");
const recoveryScript = appHtml.match(
  /<script>\s*(\/\/ Stale-build recovery[\s\S]*?)<\/script>/,
)?.[1];

type Handler = (event: unknown) => void;

function boot(href: string, { onLine = true } = {}) {
  const handlers: Record<string, Handler[]> = {};
  const fakeWindow: {
    location: { href: string; replace: ReturnType<typeof vi.fn> };
    history: { state: null; replaceState: ReturnType<typeof vi.fn> };
    navigator: { onLine: boolean };
    addEventListener: (type: string, handler: Handler) => void;
    __codexDisarmStaleBuildRecovery?: () => void;
  } = {
    location: { href, replace: vi.fn() },
    history: { state: null, replaceState: vi.fn() },
    navigator: { onLine },
    addEventListener: (type: string, handler: Handler) => {
      (handlers[type] ??= []).push(handler);
    },
  };
  new Function("window", recoveryScript!)(fakeWindow);
  const emit = (type: string, event: unknown) =>
    handlers[type]?.forEach((handler) => handler(event));
  return { fakeWindow, emit };
}

const chunk404 = {
  target: {
    tagName: "LINK",
    href: "https://codexcryptica.com/_app/immutable/chunks/BsSP-B3c.js",
  },
};

describe("stale-build recovery script in app.html", () => {
  it("is registered before SvelteKit's head output", () => {
    expect(recoveryScript).toBeDefined();
    expect(appHtml.indexOf("// Stale-build recovery")).toBeLessThan(
      appHtml.indexOf("%sveltekit.head%"),
    );
  });

  it("reloads once with a cache-busting parameter when a build chunk 404s", () => {
    const { fakeWindow, emit } = boot(
      "https://codexcryptica.com/answers?q=faction",
    );
    emit("error", chunk404);
    emit("error", chunk404);

    expect(fakeWindow.location.replace).toHaveBeenCalledTimes(1);
    const next = new URL(fakeWindow.location.replace.mock.calls[0][0]);
    expect(next.pathname).toBe("/answers");
    expect(next.searchParams.get("q")).toBe("faction");
    expect(next.searchParams.has("__cc_reload")).toBe(true);
  });

  it("recovers from a failed dynamic import of a build chunk", () => {
    const { fakeWindow, emit } = boot("https://codexcryptica.com/answers");
    emit("unhandledrejection", {
      reason: new TypeError(
        "Failed to fetch dynamically imported module: https://codexcryptica.com/_app/immutable/entry/app.BGgEN8fj.js",
      ),
    });

    expect(fakeWindow.location.replace).toHaveBeenCalledTimes(1);
  });

  it("strips the parameter after the retry and never reloads a second time", () => {
    const { fakeWindow, emit } = boot(
      "https://codexcryptica.com/answers?q=faction&__cc_reload=123#top",
    );

    expect(fakeWindow.history.replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/answers?q=faction#top",
    );
    emit("error", chunk404);
    expect(fakeWindow.location.replace).not.toHaveBeenCalled();
  });

  it("ignores failures that are not the app's own build chunks", () => {
    const { fakeWindow, emit } = boot("https://codexcryptica.com/answers");
    emit("error", {
      target: {
        tagName: "SCRIPT",
        src: "https://accounts.google.com/gsi/client",
      },
    });
    emit("error", { target: fakeWindow, message: "Uncaught TypeError" });
    emit("unhandledrejection", { reason: new Error("network down") });

    expect(fakeWindow.location.replace).not.toHaveBeenCalled();
  });

  it("stands down once the app has mounted", () => {
    const { fakeWindow, emit } = boot("https://codexcryptica.com/answers");
    fakeWindow.__codexDisarmStaleBuildRecovery!();
    emit("error", chunk404);

    expect(fakeWindow.location.replace).not.toHaveBeenCalled();
  });

  it("is disarmed by the root layout on mount", () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, "routes/+layout.svelte"),
      "utf-8",
    );
    expect(layout).toContain("window.__codexDisarmStaleBuildRecovery?.()");
  });

  it("does not reload while offline", () => {
    const { fakeWindow, emit } = boot("https://codexcryptica.com/answers", {
      onLine: false,
    });
    emit("error", chunk404);

    expect(fakeWindow.location.replace).not.toHaveBeenCalled();
  });
});
