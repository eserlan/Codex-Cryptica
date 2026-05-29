import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { NotificationStore } from "./notification.svelte";

describe("NotificationStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets and clears a notification", () => {
    const store = new NotificationStore();
    expect(store.notification).toBeNull();

    store.notify("Hello");
    expect(store.notification).toEqual({
      message: "Hello",
      type: "success",
      persistent: false,
    });

    vi.advanceTimersByTime(5000);
    expect(store.notification).toBeNull();
  });

  it("replaces an existing notification and resets the timer", () => {
    const store = new NotificationStore();

    store.notify("First");
    vi.advanceTimersByTime(2500);

    store.notify("Second", "error");
    expect(store.notification).toEqual({
      message: "Second",
      type: "error",
      persistent: false,
    });

    vi.advanceTimersByTime(2500);
    expect(store.notification).not.toBeNull(); // Should not clear yet

    vi.advanceTimersByTime(2500);
    expect(store.notification).toBeNull(); // Clears after 5000 total from second notify
  });

  it("handles persistent notifications", () => {
    const store = new NotificationStore();

    store.notify("Persistent", "info", true);
    vi.advanceTimersByTime(10000);
    expect(store.notification).not.toBeNull();

    store.clearNotification();
    expect(store.notification).toBeNull();
  });

  it("sets and clears global error", () => {
    const store = new NotificationStore();

    store.setGlobalError("Error", "Stack");
    expect(store.globalError).toEqual({ message: "Error", stack: "Stack" });

    store.clearGlobalError();
    expect(store.globalError).toBeNull();
  });

  it("handles confirm dialog", async () => {
    const store = new NotificationStore();

    const promise = store.confirm({ title: "Title", message: "Message" });
    expect(store.confirmationDialog.open).toBe(true);
    expect(store.confirmationDialog.title).toBe("Title");

    store.resolveConfirmation(true);

    const result = await promise;
    expect(result).toBe(true);
    expect(store.confirmationDialog.open).toBe(false);
  });

  it("returns false for new confirm calls if dialog is already open", async () => {
    const store = new NotificationStore();

    const promise1 = store.confirm({ title: "1", message: "1" });
    const promise2 = store.confirm({ title: "2", message: "2" });

    const result2 = await promise2;
    expect(result2).toBe(false); // Second call fails immediately

    store.resolveConfirmation(true);
    const result1 = await promise1;
    expect(result1).toBe(true);
  });

  it("resolves pending confirmation on disconnect", async () => {
    const store = new NotificationStore();

    const promise = store.confirm({ title: "Title", message: "Message" });
    store.disconnect();

    const result = await promise;
    expect(result).toBe(false);
  });
});
