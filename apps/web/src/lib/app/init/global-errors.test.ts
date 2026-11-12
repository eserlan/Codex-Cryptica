import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerGlobalErrorListeners } from "./global-errors";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { handleVersionSkewReload } from "../../../hooks.client";

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { setGlobalError: vi.fn() },
}));
vi.mock("../../../hooks.client", () => ({
  isVersionSkewError: (error: unknown) => String(error).includes("stale chunk"),
  handleVersionSkewReload: vi.fn(),
}));

let cleanup: () => void;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  cleanup = registerGlobalErrorListeners();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function reject(reason: unknown) {
  const event = new Event("unhandledrejection");
  Object.defineProperty(event, "reason", { value: reason });
  window.dispatchEvent(event);
}

describe("global errors", () => {
  it("reports runtime errors with their stack", () => {
    const error = new Error("Broken state");
    window.dispatchEvent(
      new ErrorEvent("error", { message: error.message, error }),
    );
    expect(notificationStore.setGlobalError).toHaveBeenCalledWith(
      error.message,
      error.stack,
    );
  });

  it.each([
    "Script error",
    "Load failed",
    "isHeadless",
    "notify",
    "INTERNET_DISCONNECTED",
    "Failed to fetch",
    "NetworkError",
    "higher version than the version requested",
    "VersionError",
    "ResizeObserver loop completed with delivered notifications",
    "ResizeObserver loop completed with undelivered notifications",
  ])("ignores noisy runtime errors: %s", (message) => {
    window.dispatchEvent(new ErrorEvent("error", { message }));
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
  });

  it.each(["script", "link"])("reloads only immutable %s failures", (tag) => {
    const element = document.createElement(tag);
    element.setAttribute(tag === "script" ? "src" : "href", "/other.js");
    const event = new ErrorEvent("error", { message: "asset failed" });
    Object.defineProperty(event, "target", { value: element });
    window.dispatchEvent(event);
    expect(handleVersionSkewReload).not.toHaveBeenCalled();
    element.setAttribute(
      tag === "script" ? "src" : "href",
      "/_app/immutable/app.js",
    );
    window.dispatchEvent(event);
    expect(handleVersionSkewReload).toHaveBeenCalledOnce();
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
  });

  it("checks version skew before filtering errors and rejections", () => {
    window.dispatchEvent(
      new ErrorEvent("error", { message: "stale chunk: Load failed" }),
    );
    reject(new Error("stale chunk: Failed to fetch"));
    expect(handleVersionSkewReload).toHaveBeenCalledTimes(2);
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
  });

  it.each([
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    "INTERNET_DISCONNECTED",
    "higher version than the version requested",
    "VersionError",
  ])("ignores noisy rejections: %s", (message) => {
    reject(new Error(message));
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
  });

  it("ignores default-export TypeErrors only", () => {
    reject(new TypeError("Cannot read properties reading 'default'"));
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
    reject(new Error("Cannot read properties reading 'default'"));
    expect(notificationStore.setGlobalError).toHaveBeenCalledOnce();
  });

  it("reports strings and missing rejection reasons", () => {
    reject("failure");
    reject(undefined);
    expect(notificationStore.setGlobalError).toHaveBeenNthCalledWith(
      1,
      "failure",
      undefined,
    );
    expect(notificationStore.setGlobalError).toHaveBeenNthCalledWith(
      2,
      "Unhandled Promise Rejection",
      undefined,
    );
  });

  it("does not apply script-only noise filters to rejections", () => {
    reject(new Error("notify failed"));
    expect(notificationStore.setGlobalError).toHaveBeenCalledWith(
      "notify failed",
      expect.any(String),
    );
  });

  it("removes its handlers on cleanup", () => {
    cleanup();
    window.dispatchEvent(new ErrorEvent("error", { message: "after cleanup" }));
    reject("after cleanup");
    expect(notificationStore.setGlobalError).not.toHaveBeenCalled();
  });
});
