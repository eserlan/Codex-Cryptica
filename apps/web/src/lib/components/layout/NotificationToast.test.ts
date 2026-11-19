/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import NotificationToast from "./NotificationToast.svelte";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

describe("NotificationToast info contrast", () => {
  afterEach(() => {
    cleanup();
    notificationStore.clearNotification();
  });

  it("uses theme text for the notice and action while retaining a blue info icon", () => {
    notificationStore.notify("An entity was deleted.", "info", false, {
      label: "Undo",
      run: () => {},
    });
    render(NotificationToast);

    const toast = screen.getByTestId("toast-info");
    expect(toast.className).toContain("text-theme-text");
    expect(screen.getByRole("button", { name: "Undo" }).className).toContain(
      "border-current/40",
    );
    expect(
      toast.querySelector(".icon-\\[lucide--info\\]")?.className,
    ).toContain("text-blue-500");
  });
});
