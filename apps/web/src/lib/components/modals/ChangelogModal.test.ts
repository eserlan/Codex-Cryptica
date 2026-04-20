/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

import ChangelogModal from "./ChangelogModal.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
import releases from "../../content/changelog/releases.json";

describe("ChangelogModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    HTMLElement.prototype.animate = vi.fn().mockReturnValue({
      cancel: vi.fn(),
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
      pause: vi.fn(),
      play: vi.fn(),
      reverse: vi.fn(),
    } as unknown as Animation);
    uiStore.showChangelog = true;
    uiStore.lastSeenVersion = "0.16.5";
  });

  it("moves focus into the dialog, traps tab navigation, and restores focus on close", async () => {
    const previousFocus = document.createElement("button");
    previousFocus.textContent = "Previous focus";
    document.body.appendChild(previousFocus);
    previousFocus.focus();

    const { unmount } = render(ChangelogModal);

    const dialog = await screen.findByRole("dialog", { name: "What's New" });
    const closeButton = screen.getByRole("button", { name: "Close" });
    const acknowledgeButton = screen.getByRole("button", {
      name: "Acknowledge Updates",
    });

    await waitFor(() => {
      expect(document.activeElement).toBe(closeButton);
    });

    await fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(acknowledgeButton);

    await fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(closeButton);

    await fireEvent.click(closeButton);
    expect(uiStore.showChangelog).toBe(false);
    expect(window.localStorage.getItem("codex_last_seen_version")).toBe(
      releases[0].version,
    );

    unmount();

    await waitFor(() => {
      expect(document.activeElement).toBe(previousFocus);
    });
  });

  it("uses the shared primary button token treatment", () => {
    render(ChangelogModal);

    const acknowledgeButton = screen.getByRole("button", {
      name: "Acknowledge Updates",
    });

    expect(acknowledgeButton.className).toContain("bg-theme-primary");
    expect(acknowledgeButton.className).toContain("text-theme-bg");
    expect(acknowledgeButton.className).toContain("border-theme-primary");
    expect(acknowledgeButton.className).not.toContain("text-black");
  });
});
