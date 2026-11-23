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
  it("shows two 44px phone modes in the input row, not another row", () => {
    const m = manager("ready");
    m.composerMode = "play";
    render(AdventureComposer, { props: { manager: m, phone: true } });

    const row = screen.getByTestId("adventure-free-action");
    const modes = screen.getByTestId("adventure-mobile-mode-switch");
    const play = screen.getByTestId("adventure-mobile-mode-play");
    const ask = screen.getByTestId("adventure-mobile-mode-ooc");

    expect(row.contains(modes)).toBe(true);
    expect(modes.className).not.toBe("hidden");
    expect(screen.getByTestId("adventure-composer-mode-bar").className).toBe(
      "hidden",
    );
    expect(modes.getAttribute("aria-label")).toBe("Composer mode");
    expect(play.getAttribute("aria-label")).toBe("Play (in character)");
    expect(ask.getAttribute("aria-label")).toBe("Ask GM (out of character)");
    expect(play.getAttribute("aria-pressed")).toBe("true");
    expect(ask.getAttribute("aria-pressed")).toBe("false");
    expect(play.className).toContain("min-h-11");
    expect(ask.className).toContain("min-w-11");
    expect(modes.querySelector("select")).toBeNull();
    expect(row.contains(screen.getByLabelText("What do you do?"))).toBe(true);
    const send = screen.getByTestId("adventure-submit-button");
    expect(row.contains(send)).toBe(true);
  });

  it("preserves phone drafts and routes Ask GM submissions", async () => {
    const m = manager("ready");
    m.composerMode = "play";
    m.oocDraft = "What do the marks mean?";
    m.setComposerMode = vi.fn();
    m.submitOocQuestion = vi.fn();
    const { rerender } = render(AdventureComposer, {
      props: { manager: m, phone: true },
    });

    const playField = screen.getByLabelText("What do you do?");
    await fireEvent.input(playField, {
      target: { value: "Inspect the grain ledger" },
    });
    expect(m.draft).toBe("Inspect the grain ledger");

    await fireEvent.click(screen.getByTestId("adventure-mobile-mode-ooc"));
    expect(m.setComposerMode).toHaveBeenCalledWith("ooc");
    const oocManager = { ...m, composerMode: "ooc" };
    await rerender({ manager: oocManager, phone: true });

    const oocField = screen.getByLabelText(
      "Ask the GM a question (out of character)…",
    ) as HTMLTextAreaElement;
    expect(oocField.value).toBe("What do the marks mean?");
    const ask = screen.getByTestId("adventure-mobile-mode-ooc");
    expect(ask.getAttribute("aria-pressed")).toBe("true");

    await fireEvent.input(oocField, {
      target: { value: "Is that board public knowledge?" },
    });
    expect(oocManager.oocDraft).toBe("Is that board public knowledge?");
    expect(oocManager.draft).toBe("Inspect the grain ledger");

    // A plain-object test double needs a prop refresh after a draft mutation.
    const updated = { ...oocManager };
    await rerender({ manager: updated, phone: true });
    const submit = screen.getByRole("button", {
      name: "Submit question to GM",
    });
    await fireEvent.click(submit);
    expect(m.submitOocQuestion).toHaveBeenCalledWith(
      "Is that board public knowledge?",
    );
    expect(m.submitAction).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("adventure-mobile-mode-play"));
    expect(m.setComposerMode).toHaveBeenCalledWith("play");
    await rerender({
      manager: { ...updated, composerMode: "play" },
      phone: true,
    });
    const restored = screen.getByLabelText("What do you do?");
    expect((restored as HTMLTextAreaElement).value).toBe(
      "Inspect the grain ledger",
    );
    expect(updated.oocDraft).toBe("Is that board public knowledge?");
  });

  it("keeps modes available with the keyboard while hiding suggestions", async () => {
    const m = manager("ready");
    m.composerMode = "play";
    m.suggestedActions = ["Look around"];
    render(AdventureComposer, {
      props: { manager: m, phone: true, keyboardOpen: true },
    });

    const suggestions = screen.getByTestId("adventure-suggested-actions");
    const modes = screen.getByTestId("adventure-mobile-mode-switch");
    expect(suggestions.className).toBe("hidden");
    expect(modes.className).not.toBe("hidden");
    const field = screen.getByLabelText("What do you do?");
    await fireEvent.focus(field);
    expect(suggestions.className).toBe("hidden");
    expect(screen.getByTestId("adventure-mobile-mode-ooc")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
  });

  it("matches the mobile mode switch, textarea, and submit button baseline height on phone", async () => {
    const m = manager("ready");
    render(AdventureComposer, { props: { manager: m, phone: true } });

    const modes = screen.getByTestId("adventure-mobile-mode-switch");
    const field = screen.getByLabelText("What do you do?");
    const send = screen.getByTestId("adventure-submit-button");

    expect(modes.className).toContain("min-h-[50px]");
    expect(field.className).toContain("min-h-[50px]");
    expect(send.className).toContain("min-h-[50px]");
    expect(send.className).toContain("min-w-[50px]");
    expect(field.className).toContain("sm:min-h-11");
    expect(send.className).toContain("sm:min-h-11");
  });

  it("recalculates the textarea baseline when resizing from phone to desktop", async () => {
    const { rerender } = render(AdventureComposer, {
      props: { manager: manager("ready"), phone: true },
    });
    const field = screen.getByLabelText(
      "What do you do?",
    ) as HTMLTextAreaElement;

    await waitFor(() => expect(field.style.height).toBe("50px"));
    await rerender({ manager: manager("ready"), phone: false });
    await waitFor(() => expect(field.style.height).toBe("44px"));
  });

  it("preserves desktop mode controls without showing the phone switch", () => {
    const m = manager("ready");
    m.composerMode = "play";
    render(AdventureComposer, { props: { manager: m, phone: false } });

    const desktop = screen.getByTestId("adventure-composer-mode-bar");
    const phone = screen.getByTestId("adventure-mobile-mode-switch");
    expect(desktop.className).not.toBe("hidden");
    expect(phone.className).toBe("hidden");
    expect(screen.getByTestId("adventure-mode-play")).toBeTruthy();
    expect(screen.getByTestId("adventure-mode-ooc")).toBeTruthy();
  });

  it("allows Ask GM during a roll and blocks the switch when read-only", async () => {
    const m = manager("awaiting-roll");
    m.composerMode = "play";
    m.oocDraft = "What does this saving throw represent?";
    m.setComposerMode = vi.fn();
    const { rerender } = render(AdventureComposer, {
      props: { manager: m, phone: true },
    });

    const modes = screen.getByTestId("adventure-mobile-mode-switch");
    expect(modes.className).not.toBe("hidden");
    const playField = screen.getByLabelText(
      "What do you do?",
    ) as HTMLTextAreaElement;
    expect(playField.disabled).toBe(true);

    await fireEvent.click(screen.getByTestId("adventure-mobile-mode-ooc"));
    const oocManager = { ...m, composerMode: "ooc" };
    await rerender({ manager: oocManager, phone: true });
    const askField = screen.getByLabelText(
      "Ask the GM a question (out of character)…",
    ) as HTMLTextAreaElement;
    expect(askField.disabled).toBe(false);

    await rerender({
      manager: { ...oocManager, readOnly: true },
      phone: true,
    });
    expect(modes.className).toBe("hidden");
    expect(askField.disabled).toBe(true);
  });

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

  it("hides phone suggestions while typing without clearing the draft", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, { props: { manager: m, phone: true } });
    const suggestions = screen.getByTestId("adventure-suggested-actions");
    const field = screen.getByLabelText(
      "What do you do?",
    ) as HTMLTextAreaElement;
    expect(suggestions.className).not.toBe("hidden");
    expect(field.value).toBe("Cross the flooded causeway");

    await fireEvent.focus(field);
    expect(suggestions.className).toBe("hidden");
    expect(field.value).toBe("Cross the flooded causeway");
    expect(m.draft).toBe("Cross the flooded causeway");
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

  it("keeps free action visible beside a compact pill trigger for suggested actions", () => {
    const m = manager("ready");
    m.suggestedActions = [
      "Steady the shutter as Sela lifts it.",
      "Ask Sela something before helping.",
      "Decline or turn your attention elsewhere.",
    ];
    render(AdventureComposer, { props: { manager: m } });

    const suggestions = screen.getByTestId("adventure-suggested-actions");
    expect(suggestions.tagName).toBe("DIV");
    expect(suggestions.querySelector("details")).toBeNull();
    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
    expect(toggle.textContent).toContain("3 suggested actions");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-haspopup")).toBe("dialog");
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
    expect(screen.getByLabelText("What do you do?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit action" })).toBeTruthy();
    expect(screen.getByTestId("adventure-action-dock")).toBeTruthy();
  });

  it("opens phone suggestions in a bounded bottom sheet and trims dead phone padding", async () => {
    const m = manager("ready");
    m.suggestedActions = [
      "Look over the storehouse account board and compare the grain tallies.",
      "Ask the people weighing grain about ordinary village business and recent visitors.",
      "Follow the path past the storehouse to see who is arriving at the village.",
    ];
    render(AdventureComposer, { props: { manager: m, phone: true } });

    const extras = screen.getByTestId("adventure-dock-extras");
    expect(extras.className).not.toContain("pb-2");

    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );

    const sheet = screen.getByTestId("adventure-suggested-actions-sheet");
    expect(sheet.getAttribute("role")).toBe("dialog");
    expect(sheet.className).toContain("max-h-[65%]");
    const list = screen.getByTestId("adventure-suggested-actions-list");
    expect(list.className).toContain("overflow-y-auto");

    const actions = list.querySelectorAll("button");
    expect(actions).toHaveLength(3);
    for (const action of actions) {
      expect(action.className).toContain("min-h-11");
      expect(action.className).toContain("whitespace-normal");
      expect(action.className).toContain("break-words");
      expect(action.className).not.toContain("truncate");
      expect(action.className).not.toContain("line-clamp");
    }

    await fireEvent.click(actions[2]);
    expect(m.submitSuggestedAction).toHaveBeenCalledExactlyOnceWith(
      m.suggestedActions[2],
    );
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();

    // The free-text input remains outside the extras pane.
    const freeAction = screen.getByLabelText("What do you do?");
    expect(extras.contains(freeAction)).toBe(false);
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

  it("submits on Ctrl+Enter and ignores plain Enter or empty/disabled drafts", async () => {
    const m = manager("ready");
    render(AdventureComposer, { props: { manager: m } });
    const textarea = screen.getByLabelText("What do you do?");

    await fireEvent.keyDown(textarea, { key: "Enter" });
    expect(m.submitAction).not.toHaveBeenCalled();

    await fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
    expect(m.submitAction).toHaveBeenCalledTimes(1);
    expect(m.submitAction).toHaveBeenCalledWith("Cross the flooded causeway");

    const blank = manager("ready");
    blank.draft = "   ";
    const second = render(AdventureComposer, { props: { manager: blank } });
    const blankTextarea = second.container.querySelector("textarea")!;
    await fireEvent.keyDown(blankTextarea, { key: "Enter", ctrlKey: true });
    expect(blank.submitAction).not.toHaveBeenCalled();
  });

  it("renders suggested actions and submits the chosen one", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(
      screen.getByTestId("adventure-suggested-actions-toggle"),
    );
    expect(
      screen.getByTestId("adventure-suggested-actions-sheet"),
    ).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Search the wreckage" }),
    );

    expect(m.submitSuggestedAction).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).toHaveBeenCalledWith("Search the wreckage");
    expect(
      screen.queryByTestId("adventure-suggested-actions-sheet"),
    ).toBeNull();
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

    // Trigger stays enabled so choices remain readable, while choices stay disabled.
    const toggle = screen.getByTestId(
      "adventure-suggested-actions-toggle",
    ) as HTMLButtonElement;
    expect(toggle.disabled).toBe(false);
    await fireEvent.click(toggle);
    const choice = screen.getByRole("button", {
      name: "Steady the shutter",
    }) as HTMLButtonElement;
    expect(choice.disabled).toBe(true);
    await fireEvent.click(choice);
    expect(m.submitSuggestedAction).not.toHaveBeenCalled();

    const retry = screen.getByRole("button", { name: "Try to take control" });
    await fireEvent.click(retry);
    expect(m.tryTakeControl).toHaveBeenCalledOnce();
    expect(m.submitSuggestedAction).not.toHaveBeenCalled();
  });

  it("explains the wait, blocks double clicks, then reports a live holder", async () => {
    const m = manager("ready");
    m.readOnly = true;
    m.session = { status: "active" };
    let finish!: (value: boolean) => void;
    m.tryTakeControl = vi.fn(
      () => new Promise<boolean>((resolve) => (finish = resolve)),
    );
    render(AdventureComposer, { props: { manager: m } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Try to take control" }),
    );
    expect(screen.getByTestId("control-retry-waiting").textContent).toContain(
      "This may take around 11 seconds.",
    );
    const busy = screen.getByRole("button", { name: "Checking…" });
    expect(busy.hasAttribute("disabled")).toBe(true);
    await fireEvent.click(busy);
    expect(m.tryTakeControl).toHaveBeenCalledOnce();

    finish(false);
    expect(await screen.findByText(/still in use elsewhere/)).toBeTruthy();
    expect(screen.queryByTestId("control-retry-waiting")).toBeNull();
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

  it("keeps phone trigger and desktop chip mounted in DOM once generating starts", async () => {
    const m = manager("ready");
    m.suggestedActions = ["Search the wreckage"];
    const { rerender, unmount } = render(AdventureComposer, {
      props: { manager: m, phone: true },
    });

    const generating = manager("generating");
    generating.suggestedActions = ["Search the wreckage"];
    m.submitSuggestedAction = vi.fn(() => {
      void rerender({ manager: generating, phone: true });
    });

    const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
    await fireEvent.click(toggle);
    await fireEvent.click(
      screen.getByRole("button", { name: "Search the wreckage" }),
    );

    // The trigger must stay mounted in the DOM (merely hidden), not torn out.
    expect(document.body.contains(toggle)).toBe(true);
    expect(screen.getByTestId("adventure-suggested-actions").className).toBe(
      "hidden",
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      ),
    );
    unmount();

    const desktopReady = manager("ready");
    desktopReady.suggestedActions = ["Search the wreckage"];
    const desktop = render(AdventureComposer, {
      props: { manager: desktopReady, suggestionChips: true },
    });
    const chipButton = screen.getByRole("button", {
      name: "Search the wreckage",
    });
    chipButton.focus();
    expect(document.activeElement).toBe(chipButton);

    await desktop.rerender({
      manager: { ...generating },
      suggestionChips: true,
    });
    expect(document.body.contains(chipButton)).toBe(true);
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

describe("AdventureComposer layout and chips", () => {
  it("keeps the input column bounded and lets suggestions use wide screens", () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, { props: { manager: m } });
    const extras = screen.getByTestId("adventure-dock-extras");
    const form = screen.getByTestId("adventure-free-action").closest("form")!;
    expect(extras.className).toContain("max-w-none");
    expect(extras.className).toContain("mx-auto");
    expect(form.className).toContain("max-w-3xl");
    expect(form.className).toContain("mx-auto");
  });

  it("allows suggestion chips to expand on wide screens while keeping the input bounded", () => {
    const m = manager("ready");
    m.suggestedActions = ["Ask the innkeeper"];
    render(AdventureComposer, { props: { manager: m, suggestionChips: true } });
    const extras = screen.getByTestId("adventure-dock-extras");
    expect(extras.className).toContain("max-w-none");
    expect(extras.className).toContain("mx-auto");
    expect(extras.className).not.toContain("max-w-6xl");
    expect(
      screen.getByRole("button", { name: "Ask the innkeeper" }).className,
    ).toContain("xl:flex-1");
    expect(
      screen.getByTestId("adventure-free-action").closest("form")!.className,
    ).toContain("max-w-3xl");
  });

  describe("suggestion chips", () => {
    it("shows every suggestion as a visible chip, not a collapsed list", async () => {
      const m = manager("ready");
      m.suggestedActions = ["Search the wreckage", "Call out to the ferryman"];
      render(AdventureComposer, {
        props: { manager: m, suggestionChips: true },
      });
      const group = screen.getByTestId("adventure-suggested-actions");
      expect(group.tagName).toBe("DIV");
      expect(group.querySelector("summary")).toBeNull();
      expect(group.className).not.toContain("hidden");
      await fireEvent.click(
        screen.getByRole("button", { name: "Call out to the ferryman" }),
      );
      expect(m.submitSuggestedAction).toHaveBeenCalledWith(
        "Call out to the ferryman",
      );
    });

    it("keeps the compact pill trigger on phones and for the default", () => {
      const m = manager("ready");
      m.suggestedActions = ["Search the wreckage"];
      render(AdventureComposer, { props: { manager: m, phone: true } });
      const group = screen.getByTestId("adventure-suggested-actions");
      expect(group.tagName).toBe("DIV");
      expect(group.querySelector("details")).toBeNull();
      const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
      expect(toggle.textContent).toContain("1 suggested action");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

    it("disables chips when read-only and hides them while a roll is pending", () => {
      const readOnly = manager("ready");
      readOnly.readOnly = true;
      readOnly.suggestedActions = ["Search the wreckage"];
      const { unmount } = render(AdventureComposer, {
        props: { manager: readOnly, suggestionChips: true },
      });
      expect(
        (
          screen.getByRole("button", {
            name: "Search the wreckage",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      unmount();

      const rolling = manager("awaiting-roll");
      rolling.suggestedActions = ["Search the wreckage"];
      render(AdventureComposer, {
        props: { manager: rolling, suggestionChips: true },
      });
      expect(screen.getByTestId("adventure-suggested-actions").className).toBe(
        "hidden",
      );
    });

    it("lets the player collapse and re-expand suggestion chips", async () => {
      const m = manager("ready");
      m.suggestedActions = ["Search the wreckage", "Call out to the ferryman"];
      render(AdventureComposer, {
        props: { manager: m, suggestionChips: true },
      });

      const toggle = screen.getByTestId("adventure-suggested-actions-toggle");
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(
        screen.getByRole("button", { name: "Search the wreckage" }),
      ).toBeTruthy();

      await fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
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

  describe("package-unavailable", () => {
    function unavailable(otherVersionAvailable: boolean | null) {
      const m = manager("ready");
      m.phase = "package-unavailable";
      m.readOnly = true;
      m.session = { status: "active", turns: [{}] };
      m.packageUnavailable = { otherVersionAvailable };
      m.retryPackageCheck = vi.fn(async () => false);
      m.tryTakeControl = vi.fn();
      m.close = vi.fn();
      return m;
    }

    it("shows the copy, disables the composer and offers Retry and Leave", async () => {
      const m = unavailable(false);
      render(AdventureComposer, { props: { manager: m } });
      expect(screen.getByText(/package isn't in this Vault/)).toBeTruthy();
      expect(
        (screen.getByLabelText("What do you do?") as HTMLTextAreaElement)
          .disabled,
      ).toBe(true);
      expect(
        screen.queryByRole("button", { name: "Try to take control" }),
      ).toBeNull();
      expect(screen.queryByTestId("package-other-version")).toBeNull();

      await fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(m.retryPackageCheck).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(screen.getByText(/still unavailable/)).toBeTruthy(),
      );
      await fireEvent.click(
        screen.getByRole("button", { name: "Leave session" }),
      );
      expect(m.close).toHaveBeenCalledOnce();
    });

    it("does not hide the alternate-version notice when the check is inconclusive", async () => {
      const m = unavailable(null);
      render(AdventureComposer, { props: { manager: m } });
      expect(screen.getByTestId("package-other-version").textContent).toMatch(
        /may be in this Vault/,
      );
    });

    it("shows the other-version line only when flagged", () => {
      render(AdventureComposer, { props: { manager: unavailable(true) } });
      expect(screen.getByTestId("package-other-version")).toBeTruthy();
    });
  });
});
