/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureSuggestedActions from "./AdventureSuggestedActions.svelte";

function makeManager(suggestedActions: string[] = []) {
  return {
    suggestedActions,
    submitSuggestedAction: vi.fn(async () => {}),
  } as any;
}

describe("AdventureSuggestedActions", () => {
  it("stays absent from DOM when suggestedActions is empty", () => {
    const { container } = render(AdventureSuggestedActions, {
      props: {
        manager: makeManager([]),
        disabled: false,
        visible: true,
      },
    });
    expect(
      container.querySelector("[data-testid='adventure-suggested-actions']"),
    ).toBeNull();
    expect(
      screen.queryByTestId("adventure-suggested-actions-toggle"),
    ).toBeNull();
  });

  it("formats singular and plural trigger counts", () => {
    const { rerender } = render(AdventureSuggestedActions, {
      props: {
        manager: makeManager(["Look through the shutter"]),
        disabled: false,
        visible: true,
      },
    });
    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
    expect(toggle.textContent).toContain("1 suggested action");
    expect(toggle.textContent).not.toContain("actions");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-haspopup")).toBe("dialog");

    return rerender({
      manager: makeManager([
        "Look through the shutter",
        "Call out to Sela",
        "Step back",
      ]),
      disabled: false,
      visible: true,
    }).then(() => {
      expect(toggle.textContent).toContain("3 suggested actions");
    });
  });

  it("opens the sheet, focuses close, submits once, closes, and restores focus to trigger", async () => {
    const m = makeManager([
      "Steady the shutter as Sela lifts it with both hands.",
      "Ask Sela about the ledger before helping.",
    ]);
    render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
      },
    });

    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
    await fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const sheet = screen.getByTestId("adventure-suggested-actions-sheet");
    expect(sheet.getAttribute("role")).toBe("dialog");
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(sheet.id);

    const closeBtn = screen.getByTestId("adventure-suggested-actions-close");
    await waitFor(() => expect(document.activeElement).toBe(closeBtn));

    const list = screen.getByTestId("adventure-suggested-actions-list");
    const choices = within(list).getAllByRole("button");
    expect(choices).toHaveLength(2);
    for (const choice of choices) {
      expect(choice.className).toContain("min-h-11");
      expect(choice.className).toContain("whitespace-normal");
      expect(choice.className).toContain("break-words");
    }

    await fireEvent.click(choices[1]);
    expect(m.submitSuggestedAction).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).toHaveBeenCalledWith(
      "Ask Sela about the ledger before helping.",
    );
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle);
  });

  it("portals into overlayHost with absolute positioning and uses fixed positioning without it", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    try {
      const m = makeManager(["Inspect the gate"]);
      const { unmount } = render(AdventureSuggestedActions, {
        props: {
          manager: m,
          disabled: false,
          visible: true,
          overlayHost: host,
        },
      });
      await fireEvent.click(
        screen.getByTestId("adventure-suggested-actions-toggle"),
      );
      const hostedOverlay = screen.getByTestId(
        "adventure-suggested-actions-overlay",
      );
      expect(host.contains(hostedOverlay)).toBe(true);
      expect(hostedOverlay.className).toContain("absolute inset-0 z-40");
      unmount();

      render(AdventureSuggestedActions, {
        props: {
          manager: m,
          disabled: false,
          visible: true,
        },
      });
      await fireEvent.click(
        screen.getByTestId("adventure-suggested-actions-toggle"),
      );
      const fixedOverlay = screen.getByTestId(
        "adventure-suggested-actions-overlay",
      );
      expect(fixedOverlay.className).toContain("fixed inset-0 z-50");
    } finally {
      host.remove();
    }
  });

  it("closes on close button, backdrop click, and Escape, returning focus to trigger", async () => {
    const m = makeManager(["Search the dock"]);
    render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
      },
    });
    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");

    // Close button
    await fireEvent.click(toggle);
    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-close"),
    );
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    expect(document.activeElement).toBe(toggle);

    // Backdrop click
    await fireEvent.click(toggle);
    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-backdrop"),
    );
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    expect(document.activeElement).toBe(toggle);

    // Escape key
    await fireEvent.click(toggle);
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it("traps Tab and Shift+Tab inside the open sheet, including when choices are disabled", async () => {
    const m = makeManager(["First option", "Second option"]);
    const { rerender } = render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
      },
    });

    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );
    const closeBtn = screen.getByTestId("adventure-suggested-actions-close");
    const list = screen.getByTestId("adventure-suggested-actions-list");
    const choices = within(list).getAllByRole("button");
    await waitFor(() => expect(document.activeElement).toBe(closeBtn));

    // Shift+Tab from first focusable wraps to last choice
    await fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(choices[1]);

    // Tab from last focusable wraps back to close button
    await fireEvent.keyDown(choices[1], { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);

    // When all choices are disabled, Tab and Shift+Tab stay on close button
    await rerender({
      manager: m,
      disabled: true,
      visible: true,
    });
    expect((choices[0] as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.keyDown(closeBtn, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
    await fireEvent.keyDown(closeBtn, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);
  });

  it("keeps trigger readable when disabled while disabling choices and blocking submission", async () => {
    const m = makeManager(["Search the dock"]);
    render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: true,
        visible: true,
      },
    });
    const toggle = screen.getByTestId(
      "adventure-suggested-actions-toggle",
    ) as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);

    await fireEvent.click(toggle);
    const choice = within(
      screen.getByTestId("adventure-suggested-actions-list"),
    ).getByRole("button") as HTMLButtonElement;
    expect(choice.disabled).toBe(true);
    await fireEvent.click(choice);
    expect(m.submitSuggestedAction).not.toHaveBeenCalled();
  });

  it("prevents double-submission on rapid double-click while pending", async () => {
    let resolveSubmit!: () => void;
    const m = makeManager(["Inspect the gate", "Wait quietly"]);
    m.submitSuggestedAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
      },
    });

    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );
    const choice = within(
      screen.getByTestId("adventure-suggested-actions-list"),
    ).getByRole("button", { name: "Inspect the gate" });

    // Trigger two rapid synchronous clicks before the promise resolves
    choice.click();
    choice.click();
    expect(m.submitSuggestedAction).toHaveBeenCalledOnce();

    resolveSubmit();
    await waitFor(() =>
      expect(
        screen.queryByTestId("adventure-suggested-actions-sheet"),
      ).toBeNull(),
    );
  });

  it("auto-closes when visible becomes false, suggestedActions clears, or chips flips to true", async () => {
    const m = makeManager(["Inspect the gate"]);
    const { rerender } = render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
        chips: false,
      },
    });
    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");

    // visible -> false
    await fireEvent.click(toggle);
    expect(
      screen.getByTestId("adventure-suggested-actions-sheet"),
    ).toBeTruthy();
    await rerender({
      manager: m,
      disabled: false,
      visible: false,
      chips: false,
    });
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();

    // suggestedActions -> []
    await rerender({
      manager: m,
      disabled: false,
      visible: true,
      chips: false,
    });
    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );
    expect(
      screen.getByTestId("adventure-suggested-actions-sheet"),
    ).toBeTruthy();
    await rerender({
      manager: makeManager([]),
      disabled: false,
      visible: true,
      chips: false,
    });
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();

    // chips -> true
    await rerender({
      manager: m,
      disabled: false,
      visible: true,
      chips: false,
    });
    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );
    const sheet = screen.getByTestId("adventure-suggested-actions-sheet");
    const closeButton = screen.getByTestId("adventure-suggested-actions-close");
    await waitFor(() => expect(document.activeElement).toBe(closeButton));
    expect(sheet).toBeTruthy();
    await rerender({ manager: m, disabled: false, visible: true, chips: true });
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    const chipsToggle = screen.getByTestId(
      "adventure-suggested-actions-toggle",
    );
    await waitFor(() => expect(document.activeElement).toBe(chipsToggle));
    expect(chipsToggle.isConnected).toBe(true);
    expect(
      screen.getByRole("button", { name: "Inspect the gate" }),
    ).toBeTruthy();
  });

  it("keeps desktop chips layout and collapse/expand behaviour unchanged", async () => {
    const m = makeManager(["Search the wreckage", "Call out"]);
    render(AdventureSuggestedActions, {
      props: {
        manager: m,
        disabled: false,
        visible: true,
        chips: true,
      },
    });
    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toContain("Hide suggestions");
    expect(
      screen.getByRole("button", { name: "Search the wreckage" }),
    ).toBeTruthy();

    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("Suggested actions (2)");
    expect(
      screen.queryByRole("button", { name: "Search the wreckage" }),
    ).toBeNull();

    await fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Search the wreckage" }),
    ).toBeTruthy();
  });
});
