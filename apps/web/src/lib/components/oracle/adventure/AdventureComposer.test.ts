/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureComposer from "./AdventureComposer.svelte";

function manager(
  phase: "ready" | "generating" | "awaiting-roll" | "ready-to-resolve",
) {
  return {
    phase,
    draft: "Cross the flooded causeway",
    readOnly: false,
    suggestedActions: [],
    errorMessage: null,
    submitAction: vi.fn(),
    submitSuggestedAction: vi.fn(),
    cancel: vi.fn(),
  } as any;
}

describe("AdventureComposer", () => {
  it("starts at one line and expands the composer without native resize", async () => {
    render(AdventureComposer, { props: { manager: manager("ready") } });
    const textarea = screen.getByLabelText(
      "What do you do?",
    ) as HTMLTextAreaElement;
    expect(textarea.rows).toBe(1);
    expect(textarea.className).toContain("resize-none");
    expect(textarea.className).toContain("text-base");
    expect(screen.getByTestId("adventure-action-dock").className).toContain(
      "max-h-[55%]",
    );
    await waitFor(() => expect(textarea.style.height).not.toBe(""));
  });

  it("keeps the composer and Send outside the scrollable extras", () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, { props: { manager: m } });

    const dock = screen.getByTestId("adventure-action-dock");
    const extras = screen.getByTestId("adventure-dock-extras");
    const field = screen.getByLabelText("What do you do?");
    const send = screen.getByRole("button", { name: "Submit action" });
    expect(dock.className).toContain("overflow-hidden");
    expect(extras.className).toContain("overflow-y-auto");
    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(extras.contains(suggestions)).toBe(true);
    expect(extras.contains(field)).toBe(false);
    expect(extras.contains(send)).toBe(false);
    expect(dock.contains(field)).toBe(true);
    expect(dock.contains(send)).toBe(true);
  });

  it("hides phone suggestions while typing", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, { props: { manager: m, phone: true } });
    const suggestions = screen.getByTestId("adventure-suggested-actions");
    const field = screen.getByLabelText("What do you do?");
    expect(suggestions.className).not.toBe("hidden");

    await fireEvent.focus(field);
    expect(suggestions.className).toBe("hidden");
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();

    await fireEvent.blur(field);
    expect(suggestions.className).not.toBe("hidden");
  });

  it("hides suggestions with a phone keyboard open", () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, {
      props: { manager: m, phone: true, keyboardOpen: true },
    });
    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(suggestions.className).toBe("hidden");
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
  });

  it("keeps free action visible beside a compact dropdown of suggested actions", () => {
    const m = manager("ready");
    m.suggestedActions = [
      "Steady the shutter as Sela lifts it.",
      "Ask Sela something before helping.",
      "Decline or turn your attention elsewhere.",
    ];
    render(AdventureComposer, { props: { manager: m } });

    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(suggestions.tagName).toBe("DETAILS");
    expect((suggestions as HTMLDetailsElement).open).toBe(false);
    expect(suggestions.className).not.toContain("overflow-x-auto");
    const actionButtons = suggestions.querySelectorAll("button");
    expect(actionButtons).toHaveLength(3);
    expect(actionButtons[0].className).toContain("w-full");
    expect(actionButtons[0].className).not.toContain("line-clamp");
    expect(actionButtons[0].parentElement?.className).toContain("max-h-36");
    expect(actionButtons[0].parentElement?.className).toContain(
      "overflow-y-auto",
    );
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
    expect(screen.getByTestId("adventure-action-dock")).toBeTruthy();
  });

  it("shows a Cancel affordance and the selected action while generating", () => {
    const m = manager("generating");
    render(AdventureComposer, { props: { manager: m } });

    expect(
      screen.getByText("Playing: Cross the flooded causeway"),
    ).toBeTruthy();

    // The field stays mounted (just hidden) so a focused element is never
    // yanked out from under the user — see the comment in the component for
    // why: removing it mid-interaction silently exits native fullscreen.
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("cancels the pending request", async () => {
    const m = manager("generating");
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(m.cancel).toHaveBeenCalledOnce();
  });

  it("shows the action form when the player can act", () => {
    render(AdventureComposer, { props: { manager: manager("ready") } });

    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
  });

  it("submits the drafted action", async () => {
    const m = manager("ready");
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Submit action" }),
    );

    expect(m.submitAction).toHaveBeenCalledWith("Cross the flooded causeway");
  });

  it("renders suggested actions and submits the chosen one", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    render(AdventureComposer, { props: { manager: m } });

    const suggestions = screen.getByTestId(
      "adventure-suggested-actions",
    ) as HTMLDetailsElement;
    await fireEvent.click(suggestions.querySelector("summary")!);
    expect(suggestions.open).toBe(true);

    await fireEvent.click(
      screen.getByRole("button", { name: "Search the wreckage" }),
    );

    expect(m.submitSuggestedAction).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).toHaveBeenCalledWith("Search the wreckage");
  });

  it("shows a control retry without allowing read-only actions", async () => {
    const m = manager("ready");
    m.readOnly = true;
    m.session = { status: "active" };
    m.suggestedActions = ["Steady the shutter"];
    m.tryTakeControl = vi.fn().mockResolvedValue(true);
    render(AdventureComposer, { props: { manager: m } });

    expect(screen.getByText(/Another tab may be controlling/)).toBeTruthy();
    const submit = screen.getByRole("button", { name: "Submit action" });
    expect(submit.hasAttribute("disabled")).toBe(true);
    const suggested = screen.getByTestId("adventure-suggested-actions");
    expect(
      (suggested.querySelector("button") as HTMLButtonElement).disabled,
    ).toBe(true);

    const retry = screen.getByRole("button", { name: "Try to take control" });
    await fireEvent.click(retry);
    expect(m.tryTakeControl).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).not.toHaveBeenCalled();
  });

  it.each(["awaiting-roll", "ready-to-resolve"] as const)(
    "hides competing action controls while a roll is %s",
    (phase) => {
      const m = manager(phase);
      m.suggestedActions = ["Hold the sea wall"];
      render(AdventureComposer, { props: { manager: m } });

      expect(screen.getByTestId("adventure-suggested-actions").className).toBe(
        "hidden",
      );
      expect(screen.getByTestId("adventure-free-action").className).toBe(
        "hidden",
      );
    },
  );

  it("keeps a just-clicked suggested action in the DOM (disabled) once generating starts", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    const { rerender } = render(AdventureComposer, { props: { manager: m } });

    const summary = screen
      .getByTestId("adventure-suggested-actions")
      .querySelector("summary");
    expect(summary).not.toBeNull();
    await fireEvent.click(summary!);
    const button = screen.getByRole("button", { name: "Search the wreckage" });
    button.focus();
    expect(document.activeElement).toBe(button);

    // Simulate the phase flipping to "generating" right after the click, as
    // the real manager does once submitSuggestedAction resolves — the real
    // manager's suggestedActions getter still reflects the prior turn until
    // the new one commits, so it stays populated during generating too.
    const generating = manager("generating");
    generating.suggestedActions = ["Search the wreckage"];
    await rerender({ manager: generating });

    // The button must still exist in the DOM (merely disabled elsewhere),
    // not be torn out — see the component comment for why that matters.
    expect(document.body.contains(button)).toBe(true);
  });
});

it("offers retry for an incomplete opening and invokes the existing manager", async () => {
  const m = manager("ready");
  m.session = { turns: [], pendingRoll: null };
  m.errorMessage = "Unable to load world context. Please retry.";
  m.retryOpening = vi.fn(async () => {});
  render(AdventureComposer, { props: { manager: m } });
  await fireEvent.click(screen.getByRole("button", { name: "Retry opening" }));
  expect(m.retryOpening).toHaveBeenCalledOnce();
});

it("keeps an opening retry unavailable in read-only play", () => {
  const m = manager("ready");
  m.session = { turns: [], pendingRoll: null };
  m.readOnly = true;
  m.errorMessage = "Unable to load world context. Please retry.";
  render(AdventureComposer, { props: { manager: m } });
  expect(screen.queryByRole("button", { name: "Retry opening" })).toBeNull();
});

it("offers opening recovery after reload even without a stored error", () => {
  const m = manager("ready");
  m.session = { turns: [], pendingRoll: null };
  m.retryOpening = vi.fn(async () => {});
  render(AdventureComposer, { props: { manager: m } });
  expect(
    (screen.getByRole("button", { name: "Retry opening" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  expect(
    (screen.getByRole("button", { name: "Submit action" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
