// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { MAX_CONVERSATION_TURNS, MAX_IDEA_LENGTH } from "generator-engine";
import IdeaDeveloperTool from "./IdeaDeveloperTool.svelte";
import { IdeaDeveloperStore } from "$lib/stores/idea-developer.svelte";
import type { StartResult } from "$lib/services/idea-developer/idea-developer-service";
import type { StorageLike } from "$lib/utils/runtime-deps";

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility
// (the existing save modal fades in).
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as Animation;
}

const development = {
  mode: "develop" as const,
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    {
      name: "Mara",
      role: "Smith",
      wants: "More scales",
      conflictsWith: "The Warden",
    },
    {
      name: "The Warden",
      role: "Guard",
      wants: "Nothing new",
      conflictsWith: "Mara",
    },
  ],
  playerDirections: [
    { title: "Follow the shipment", description: "Trace it." },
    { title: "Search the cellars", description: "Find the source." },
  ],
  consequences: "The town runs out of parts.",
  creatorQuestions: ["Who built it?", "Are dragons extinct?"],
  generatorSuggestions: [],
};

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    length: 0,
    key: () => null,
  };
}

function setup(
  result: StartResult | Promise<StartResult> = {
    status: "ok",
    development,
    interactionId: "i-1",
    ideaText: "A town made of dragon parts.",
  },
  extraProps: Record<string, unknown> = {},
) {
  const service = { start: vi.fn().mockReturnValue(Promise.resolve(result)) };
  const store = new IdeaDeveloperStore(service as never, memoryStorage());
  render(IdeaDeveloperTool, { props: { store, ...extraProps } });
  return { store, service };
}

const submitButton = () =>
  screen.getByRole("button", { name: /develop my idea/i });
const textbox = () =>
  screen.getByRole("textbox", {
    name: /your rpg idea/i,
  }) as HTMLTextAreaElement;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("IdeaDeveloperTool and the notice", () => {
  it("leaves the notice to the page, so it does not crowd the tool", () => {
    setup();
    expect(screen.queryByTestId("conversation-notice")).toBeNull();
    expect(screen.getByTestId("submit-area")).toBeTruthy();
  });
});

describe("IdeaDeveloperTool input", () => {
  it("disables submit while empty and enables it once there is text", async () => {
    setup();
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    expect((submitButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the maximum length next to the input", () => {
    setup();
    expect(screen.getByText(new RegExp(String(MAX_IDEA_LENGTH)))).toBeTruthy();
  });
});

describe("IdeaDeveloperTool running a turn", () => {
  it("shows a progress line, disables submit and offers cancel while a turn runs", async () => {
    let release!: (value: StartResult) => void;
    const pending = new Promise<StartResult>((r) => (release = r));
    const { store } = setup(pending);
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(screen.getByRole("status")).toBeTruthy();
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
    release({ status: "cancelled" });
    await vi.waitFor(() => expect(store.status).toBe("editing"));
  });

  it("shows the original idea beside the result and every section", async () => {
    setup();
    await fireEvent.input(textbox(), {
      target: { value: "A town made of dragon parts." },
    });
    await fireEvent.click(submitButton());
    expect(
      await screen.findByText("Where do the parts come from?"),
    ).toBeTruthy();
    expect(screen.getByText("A town made of dragon parts.")).toBeTruthy();
    expect(
      screen.getByText("Everything is made from dragon parts."),
    ).toBeTruthy();
    expect(screen.getByText("The last shipment is late.")).toBeTruthy();
    expect(screen.getAllByText(/Mara/).length).toBeGreaterThan(0);
    expect(screen.getByText("Follow the shipment")).toBeTruthy();
    expect(screen.getByText("The town runs out of parts.")).toBeTruthy();
    expect(screen.getByText("Who built it?")).toBeTruthy();
  });

  it("never shows a score or rating", async () => {
    setup();
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");
    expect(document.body.textContent).not.toMatch(/\bscore\b|\brating\b|\/10/i);
  });

  it("copies the full result", async () => {
    const copyContent = vi.fn().mockResolvedValue(true);
    setup(undefined, { clipboardService: { copyContent } });
    await fireEvent.input(textbox(), {
      target: { value: "A town made of dragon parts." },
    });
    await fireEvent.click(submitButton());
    await fireEvent.click(
      await screen.findByRole("button", { name: /copy result/i }),
    );
    expect(copyContent).toHaveBeenCalledWith({
      markdown: expect.stringContaining("A town made of dragon parts."),
    });
    expect(copyContent.mock.calls[0][0].markdown).toContain(
      "Where do the parts come from?",
    );
  });

  it("offers a new conversation once there is a result", async () => {
    const { store } = setup();
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    await fireEvent.click(
      await screen.findByRole("button", { name: /new conversation/i }),
    );
    expect(store.status).toBe("empty");
  });
});

describe("IdeaDeveloperTool problems", () => {
  it("keeps the text and lets the user retry after a failure", async () => {
    const { service } = setup({
      status: "failed",
      ideaText: "A town.",
      failure: {
        code: "unknown",
        message: "Something went wrong. Your idea is still here.",
      },
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(await screen.findByText(/Your idea is still here/)).toBeTruthy();
    expect(textbox().value).toBe("A town.");
    expect((submitButton() as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(submitButton());
    expect(service.start).toHaveBeenCalledTimes(2);
  });

  it("shows the bot-check message with the text kept", async () => {
    setup({
      status: "failed",
      ideaText: "A town.",
      failure: {
        code: "bot-check",
        message: "We couldn't confirm you're a person. Try again.",
      },
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(
      await screen.findByText(/couldn't confirm you're a person/i),
    ).toBeTruthy();
    expect(textbox().value).toBe("A town.");
  });

  it("shows when to try again after a limit", async () => {
    setup({
      status: "limited",
      reason: "cooldown",
      retryAt: new Date("2030-01-01T12:00:00Z").getTime(),
      message: "You've made a lot of requests. Try again in a little while.",
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(await screen.findByText(/try again/i)).toBeTruthy();
    expect(screen.getByTestId("retry-time").textContent).toMatch(/\d/);
  });

  it("asks for an RPG idea when the reply says the text was not one", async () => {
    setup({
      status: "needs-rpg-idea",
      message: "Tell me about a game idea.",
      interactionId: "i-1",
      ideaText: "hello",
    });
    await fireEvent.input(textbox(), { target: { value: "hello" } });
    await fireEvent.click(submitButton());
    expect(await screen.findByText("Tell me about a game idea.")).toBeTruthy();
    expect(textbox().value).toBe("hello");
  });

  it("copes with a rejected input message", async () => {
    setup({
      status: "rejected",
      reason: "too-long",
      message: "That is too long.",
    });
    await fireEvent.input(textbox(), { target: { value: "x" } });
    await fireEvent.click(submitButton());
    expect(await screen.findByText("That is too long.")).toBeTruthy();
  });
});

describe("IdeaDeveloperTool modes", () => {
  it("offers only the modes that are defined", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([
      "assess",
      "develop",
    ]);
  });

  it("starts in Develop and passes the chosen mode to the service", async () => {
    const { service } = setup();
    expect(
      (screen.getByRole("radio", { name: /develop/i }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    await fireEvent.click(screen.getByRole("radio", { name: /assess/i }));
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(service.start).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "assess" }),
    );
  });

  it("shows the mode label on the result", async () => {
    setup({
      status: "ok",
      development: { ...development, mode: "assess" },
      interactionId: "i-1",
      ideaText: "A town.",
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    expect(await screen.findByTestId("mode-label")).toBeTruthy();
    expect(screen.getByTestId("mode-label").textContent).toMatch(/assess/i);
  });
});

describe("IdeaDeveloperTool develop further and saving", () => {
  async function developed(props: Record<string, unknown> = {}) {
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development: {
          ...development,
          generatorSuggestions: [
            { generatorKey: "settlement", reason: "The town needs a shape." },
            { generatorKey: "faction", reason: "Two groups want the parts." },
          ],
        },
        interactionId: "i-1",
        ideaText: "A town.",
        hubDraftId: "hub-1",
      }),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    render(IdeaDeveloperTool, { props: { store, ...props } });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");
    return { store };
  }

  it("puts the generators after the keep-developing controls, not inside the result", async () => {
    await developed();
    const keep = screen.getByRole("heading", { name: /keep developing/i });
    const further = screen.getByRole("heading", { name: /develop further/i });
    const result = screen.getByTestId("development-result");
    const after = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(keep.compareDocumentPosition(further) & after).toBeTruthy();
    expect(result.contains(further)).toBe(false);
    // and the actions come last
    const save = screen.getByRole("button", { name: /save to your codex/i });
    expect(further.compareDocumentPosition(save) & after).toBeTruthy();
  });

  it("still offers the generators once the turn limit is reached", async () => {
    const { store } = await developed();
    const turns = Array.from({ length: MAX_CONVERSATION_TURNS - 1 }, () => ({
      kind: "answer-questions" as const,
      mode: "develop" as const,
      text: "x",
      status: "done" as const,
    }));
    store.conversation = {
      ...store.conversation!,
      turns: [...store.conversation!.turns, ...turns],
    };
    expect(await screen.findByText(/reached its limit/i)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /develop further/i }),
    ).toBeTruthy();
  });

  it("shows generator links under develop further", async () => {
    await developed();
    expect(
      screen.getByRole("heading", { name: /develop further/i }),
    ).toBeTruthy();
    expect(screen.getByText("The town needs a shape.")).toBeTruthy();
  });

  it("offers Save to your Codex and opens the save modal when it works", async () => {
    const save = vi.fn().mockReturnValue({ ok: true });
    await developed({ saveToCodex: { save } });
    await fireEvent.click(
      screen.getByRole("button", { name: /save to your codex/i }),
    );
    expect(save).toHaveBeenCalledWith("hub-1");
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("shows a message and no modal when saving is blocked", async () => {
    const save = vi.fn().mockReturnValue({
      ok: false,
      message: "Storage access is blocked. Please copy the result manually.",
    });
    await developed({ saveToCodex: { save } });
    await fireEvent.click(
      screen.getByRole("button", { name: /save to your codex/i }),
    );
    expect(await screen.findByText(/storage access is blocked/i)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("IdeaDeveloperTool continuing a conversation", () => {
  const second = { ...development, whatChanged: "Sharpened the rivals." };

  async function developed(
    next: unknown = {
      status: "ok",
      development: second,
      interactionId: "i-2",
      turn: {
        kind: "answer-questions",
        mode: "develop",
        text: "They left.",
        status: "done",
      },
    },
  ) {
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development,
        interactionId: "i-1",
        ideaText: "A town made of dragon parts.",
        hubDraftId: "hub-1",
      }),
      continue: vi.fn().mockResolvedValue(next),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    render(IdeaDeveloperTool, { props: { store } });
    await fireEvent.input(textbox(), {
      target: { value: "A town made of dragon parts." },
    });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");
    return { store, service };
  }

  const followUpBox = () =>
    screen.getByRole("textbox", {
      name: /your answers or requested change/i,
    }) as HTMLTextAreaElement;

  it("offers the three ways to continue after a result", async () => {
    await developed();
    expect(
      screen.getByRole("button", { name: /answer the questions/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /ask for a change/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /continue in assess/i }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /continue in develop/i }),
    ).toBeNull();
  });

  it("shows the original idea read-only, with no way to edit it", async () => {
    await developed();
    expect(screen.getByText("A town made of dragon parts.")).toBeTruthy();
    const boxes = screen.getAllByRole("textbox");
    expect(boxes).toHaveLength(1);
    expect((boxes[0] as HTMLTextAreaElement).value).toBe("");
    expect(
      screen.queryByRole("textbox", { name: /your rpg idea/i }),
    ).toBeNull();
  });

  it("shows no what-changed line on the first result", async () => {
    await developed();
    expect(screen.queryByText(/what changed/i)).toBeNull();
  });

  it("sends the answers and shows what changed on the next result", async () => {
    const { service } = await developed();
    await fireEvent.input(followUpBox(), {
      target: { value: "They left long ago." },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /answer the questions/i }),
    );
    expect(await screen.findByText(/sharpened the rivals/i)).toBeTruthy();
    expect(service.continue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "answer-questions",
        text: "They left long ago.",
      }),
    );
    expect(followUpBox().value).toBe("");
  });

  it("sends a requested change as a change turn", async () => {
    const { service } = await developed();
    await fireEvent.input(followUpBox(), {
      target: { value: "Make the Warden softer." },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /ask for a change/i }),
    );
    await vi.waitFor(() => expect(service.continue).toHaveBeenCalled());
    expect(service.continue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "change-part",
        text: "Make the Warden softer.",
      }),
    );
  });

  it("switches mode without needing any text", async () => {
    const { service } = await developed();
    await fireEvent.click(
      screen.getByRole("button", { name: /continue in assess/i }),
    );
    await vi.waitFor(() => expect(service.continue).toHaveBeenCalled());
    expect(service.continue).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "switch-mode", mode: "assess" }),
    );
  });

  it("disables answering and changing while there is nothing typed", async () => {
    await developed();
    expect(
      (
        screen.getByRole("button", {
          name: /answer the questions/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /ask for a change/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows progress, disables the actions and offers cancel while a turn runs", async () => {
    let release!: (value: unknown) => void;
    const pending = new Promise((r) => (release = r));
    const { store } = await developed(pending);
    await fireEvent.input(followUpBox(), { target: { value: "x" } });
    await fireEvent.click(
      screen.getByRole("button", { name: /answer the questions/i }),
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: /answer the questions/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /continue in assess/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    release({ status: "cancelled" });
    await vi.waitFor(() => expect(store.turnRunning).toBe(false));
    expect(store.conversation?.turns).toHaveLength(1);
  });

  it("shows a failure and keeps what was typed", async () => {
    await developed({
      status: "failed",
      failure: { code: "unknown", message: "Something went wrong. Try again." },
    });
    await fireEvent.input(followUpBox(), { target: { value: "They left." } });
    await fireEvent.click(
      screen.getByRole("button", { name: /answer the questions/i }),
    );
    expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
    expect(followUpBox().value).toBe("They left.");
  });

  it("says the limit is reached and offers a new conversation and copying", async () => {
    const { store } = await developed();
    const turns = Array.from({ length: MAX_CONVERSATION_TURNS - 1 }, () => ({
      kind: "answer-questions" as const,
      mode: "develop" as const,
      text: "x",
      status: "done" as const,
    }));
    store.conversation = {
      ...store.conversation!,
      turns: [...store.conversation!.turns, ...turns],
    };
    expect(await screen.findByText(/reached its limit/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /new conversation/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /copy result/i })).toBeTruthy();
    expect(
      screen.queryByRole("textbox", {
        name: /your answers or requested change/i,
      }),
    ).toBeNull();
  });

  it("starts a new conversation and returns to an empty tool", async () => {
    const { store } = await developed();
    await fireEvent.click(
      screen.getByRole("button", { name: /new conversation/i }),
    );
    expect(store.status).toBe("empty");
    expect(
      screen.getByRole("textbox", { name: /your rpg idea/i }),
    ).toBeTruthy();
  });
});

describe("IdeaDeveloperTool funnel events", () => {
  it("records the moment Save to your Codex is chosen", async () => {
    const tracker = {
      signupStarted: vi.fn(),
      generatorOpened: vi.fn(),
    };
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development: {
          ...development,
          generatorSuggestions: [{ generatorKey: "npc", reason: "A person." }],
        },
        interactionId: "i-1",
        ideaText: "A town.",
        hubDraftId: "hub-1",
      }),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    render(IdeaDeveloperTool, {
      props: { store, tracker, saveToCodex: { save: () => ({ ok: true }) } },
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");

    await fireEvent.click(screen.getByRole("link", { name: /npc generator/i }));
    expect(tracker.generatorOpened).toHaveBeenCalledWith({
      generatorKey: "npc",
      position: 0,
    });

    await fireEvent.click(
      screen.getByRole("button", { name: /save to your codex/i }),
    );
    expect(tracker.signupStarted).toHaveBeenCalledTimes(1);
  });

  it("does not record a sign-up when saving fails", async () => {
    const tracker = { signupStarted: vi.fn(), generatorOpened: vi.fn() };
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development,
        interactionId: "i-1",
        ideaText: "A town.",
        hubDraftId: "hub-1",
      }),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    render(IdeaDeveloperTool, {
      props: {
        store,
        tracker,
        saveToCodex: { save: () => ({ ok: false, message: "Blocked." }) },
      },
    });
    await fireEvent.input(textbox(), { target: { value: "A town." } });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");
    await fireEvent.click(
      screen.getByRole("button", { name: /save to your codex/i }),
    );
    expect(tracker.signupStarted).not.toHaveBeenCalled();
  });
});

describe("IdeaDeveloperTool after a follow-up turn", () => {
  const second = {
    ...development,
    mode: "assess" as const,
    whatChanged: "Looked at it as an assessment.",
    centralQuestion: "Who is quietly buying the parts?",
  };

  async function developed() {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development,
        interactionId: "i-1",
        ideaText: "A town made of dragon parts.",
        hubDraftId: "hub-1",
      }),
      continue: vi.fn().mockResolvedValue({
        status: "ok",
        development: second,
        interactionId: "i-2",
        turn: { kind: "switch-mode", mode: "assess", text: "", status: "done" },
      }),
    };
    const store = new IdeaDeveloperStore(service as never, memoryStorage(), {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    render(IdeaDeveloperTool, { props: { store } });
    await fireEvent.input(textbox(), {
      target: { value: "A town made of dragon parts." },
    });
    await fireEvent.click(submitButton());
    await screen.findByText("Where do the parts come from?");
    return { store, scrollIntoView };
  }

  it("brings the updated result into view and focuses it", async () => {
    const { scrollIntoView } = await developed();
    scrollIntoView.mockClear();
    await fireEvent.click(
      screen.getByRole("button", { name: /continue in assess/i }),
    );
    await screen.findByText("Who is quietly buying the parts?");
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(document.activeElement).toBe(screen.getByTestId("result-anchor"));
  });

  it("marks the section that changed and says which turn this is", async () => {
    await developed();
    await fireEvent.click(
      screen.getByRole("button", { name: /continue in assess/i }),
    );
    await screen.findByText("Who is quietly buying the parts?");
    expect(screen.getAllByText("Updated")).toHaveLength(1);
    expect(
      screen.getByText(/sections updated: central question/i),
    ).toBeTruthy();
    expect(screen.getByTestId("mode-label").textContent).toMatch(
      /assess mode.*turn 2 of 8/i,
    );
  });

  it("does not steal focus just because a saved conversation was restored", async () => {
    const storage = memoryStorage();
    const service = {
      start: vi.fn().mockResolvedValue({
        status: "ok",
        development: {
          ...development,
          generatorSuggestions: [
            { generatorKey: "npc", reason: "A person." },
            { generatorKey: "faction", reason: "A group." },
          ],
        },
        interactionId: "i-1",
        ideaText: "A town.",
        hubDraftId: "hub-1",
      }),
    };
    const first = new IdeaDeveloperStore(service as never, storage, {
      remove: vi.fn(),
      exists: () => true,
    } as never);
    first.setIdea("A town.");
    await first.submit();
    cleanup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const restored = new IdeaDeveloperStore(
      { start: vi.fn() } as never,
      storage,
      {
        remove: vi.fn(),
        exists: () => true,
      } as never,
    );
    render(IdeaDeveloperTool, { props: { store: restored } });
    await screen.findByText("Where do the parts come from?");
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(
      screen.getByTestId("result-anchor"),
    );
  });
});
