/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sanitizeHelpContext, type HelpAnswer } from "help-engine";
import type { HelpAskResult } from "$lib/services/help-assistant/help-client";
import { HelpAssistantStore } from "$lib/stores/help-assistant/help-assistant.svelte";
import HelpAssistantPanel from "./HelpAssistantPanel.svelte";

const context = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  flags: ["connections-editable"],
  availableActions: ["status-tab", "connections-tab"],
});

const guide = {
  type: "openPanel",
  panel: "status-tab",
  label: "Open the Status tab",
  then: { type: "highlight", target: "add-connection-button", label: "Add" },
} as const;

const answered: HelpAnswer = {
  outcome: "answered",
  answer: "Open the Status tab and use Add.",
  sources: [
    {
      id: "connections-tab#0",
      title: "Connections Tab",
      helpId: "connections-tab",
    },
  ],
  action: guide,
  suggestions: [],
};

function setup(
  ask: () => Promise<HelpAskResult> = async () => ({
    ok: true,
    answer: answered,
  }),
) {
  const assistant = new HelpAssistantStore({
    client: { ask: vi.fn(ask) },
    context: { current: context, signature: "s" },
    fallback: (error) => ({
      message: `You're offline (${error.kind}). The help for this screen is still here:`,
      topics: [{ helpId: "connections-tab", title: "Connections Tab" }],
      showLibrary: false,
    }),
    helpIds: () => new Set(["connections-tab"]),
  });
  const props = {
    assistant,
    onAccept: vi.fn(),
    onOpenArticle: vi.fn(),
    onOpenLibrary: vi.fn(),
    onClose: vi.fn(() => assistant.close()),
  };
  render(HelpAssistantPanel, props);
  return props;
}

// jsdom has no Web Animations API; Svelte transitions need it when the panel closes.
beforeEach(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: vi.fn(),
          play: vi.fn(),
        }) as unknown as Animation,
    );
  }
});

const type = async (text: string) => {
  await fireEvent.input(screen.getByLabelText(/Ask a question/i), {
    target: { value: text },
  });
};

describe("HelpAssistantPanel", () => {
  it("scrolls the conversation to a new answer after it renders", async () => {
    const { assistant } = setup();
    assistant.open();
    const log = await screen.findByRole("log");
    Object.defineProperty(log, "scrollHeight", {
      configurable: true,
      get: () => 800,
    });
    log.scrollTop = 0;
    await assistant.ask("How do I connect entities?");
    await waitFor(() => expect(log.scrollTop).toBe(800));
    expect(screen.getByText(answered.answer)).toBeDefined();
  });

  it("lets the user scroll up without snapping back on unrelated updates", async () => {
    const { assistant } = setup();
    assistant.open();
    const log = await screen.findByRole("log");
    Object.defineProperty(log, "scrollHeight", {
      configurable: true,
      get: () => 800,
    });
    await assistant.ask("How do I connect entities?");
    await waitFor(() => expect(log.scrollTop).toBe(800));
    log.scrollTop = 100;
    await fireEvent.scroll(log);
    await type("Another question");
    expect(log.scrollTop).toBe(100);
  });

  it("renders nothing while closed", () => {
    setup();
    expect(screen.queryByTestId("help-assistant-panel")).toBeNull();
  });

  it("keeps the panel above the mobile ActivityBar and to the left on mobile and desktop", async () => {
    const { assistant } = setup();
    assistant.open();

    const panel = await waitFor(() =>
      screen.getByTestId("help-assistant-panel"),
    );
    const classes = panel.className;
    expect(classes).toContain(
      "bottom-[calc(7.25rem_+_env(safe-area-inset-bottom,0px))]",
    );
    expect(classes).toContain(
      "max-h-[min(36rem,calc(100dvh_-_11rem_-_env(safe-area-inset-bottom,0px)))]",
    );
    expect(classes).toContain("left-3");
    expect(classes).toContain("md:bottom-16");
    expect(classes).toContain("md:left-[4.5rem]");
    expect(classes).toContain("md:max-h-[min(36rem,calc(100dvh-7rem))]");
  });

  it("is a labelled dialog with a labelled input once open", async () => {
    const { assistant } = setup();
    assistant.open();
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Help assistant" }),
      ).toBeTruthy(),
    );
    expect(
      screen.getByLabelText(/Ask a question about using Codex Cryptica/i),
    ).toBeTruthy();
  });

  it("tells the user plainly what is sent", async () => {
    const { assistant } = setup();
    assistant.open();
    await waitFor(() =>
      screen.getByText(
        /Your question goes to our AI service. Avoid pasting private lore./,
      ),
    );
  });

  it("asks, shows the answer with its source, and offers the guide", async () => {
    const { assistant, onOpenArticle } = setup();
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("How do I connect the faction?");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => screen.getByText("Open the Status tab and use Add."));
    await fireEvent.click(
      screen.getByRole("button", { name: "Connections Tab" }),
    );
    expect(onOpenArticle).toHaveBeenCalledWith("connections-tab");
    expect(screen.getByTestId("help-action-offer")).toBeTruthy();
  });

  it("submits with Enter and keeps Shift+Enter for a new line", async () => {
    const { assistant } = setup();
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    const box = screen.getByLabelText(/Ask a question/i);
    await type("hello");
    await fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(assistant.messages).toHaveLength(0);
    await fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(assistant.messages.length).toBeGreaterThan(0));
  });

  it("does not send an empty question", async () => {
    const { assistant } = setup();
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    expect(
      (screen.getByRole("button", { name: "Ask" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("closes on Escape and from the close button without touching the conversation", async () => {
    const { assistant, onClose } = setup();
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("question");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => screen.getByText("Open the Status tab and use Add."));
    await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(assistant.messages).toHaveLength(2);
  });

  it("shows progress and a cancel button while an answer is pending", async () => {
    const { assistant } = setup(() => new Promise(() => {}));
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("slow question");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => screen.getByRole("status"));
    expect(screen.getByText("Looking that up…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    assistant.reset();
  });
});

describe("HelpAssistantPanel — on-screen keyboard", () => {
  class FakeViewport extends EventTarget {
    constructor(
      public height: number,
      public offsetTop = 0,
    ) {
      super();
    }
  }
  let vv: FakeViewport;

  beforeEach(() => {
    vv = new FakeViewport(window.innerHeight);
    Object.defineProperty(window, "visualViewport", {
      value: vv,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      configurable: true,
    });
  });

  it("keeps the default position while no keyboard is showing", async () => {
    const { assistant } = setup();
    assistant.open();
    const panel = await screen.findByTestId("help-assistant-panel");
    expect(panel.style.bottom).toBe("");
    expect(panel.style.maxHeight).toBe("");
  });

  it("lifts the panel above the keyboard and fits it to the visible area, so the question box stays reachable", async () => {
    const { assistant } = setup();
    assistant.open();
    const panel = await screen.findByTestId("help-assistant-panel");

    vv.height = window.innerHeight - 320; // a 320px keyboard
    vv.dispatchEvent(new Event("resize"));

    await waitFor(() => expect(panel.style.bottom).toBe("328px"));
    expect(panel.style.maxHeight).toBe(`${window.innerHeight - 320 - 16}px`);
  });

  it("puts the panel back when the keyboard closes", async () => {
    const { assistant } = setup();
    assistant.open();
    const panel = await screen.findByTestId("help-assistant-panel");
    vv.height = window.innerHeight - 320;
    vv.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(panel.style.bottom).not.toBe(""));

    vv.height = window.innerHeight;
    vv.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(panel.style.bottom).toBe(""));
    expect(panel.style.maxHeight).toBe("");
  });

  it("stops following the viewport once the panel is closed", async () => {
    const remove = vi.spyOn(vv, "removeEventListener");
    const { assistant } = setup();
    assistant.open();
    await screen.findByTestId("help-assistant-panel");
    expect(remove).not.toHaveBeenCalled();

    assistant.close();

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith("resize", expect.any(Function)),
    );
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

describe("HelpAssistantPanel — no authoritative answer and failure", () => {
  it("shows no-match honestly with clickable closest topics", async () => {
    const noMatch: HelpAnswer = {
      outcome: "no-match",
      answer:
        "I couldn't find documented help for that. These topics are the closest:",
      sources: [],
      action: null,
      suggestions: [{ helpId: "graph-basics", title: "Graph Basics" }],
    };
    const { assistant, onOpenArticle } = setup(async () => ({
      ok: true,
      answer: noMatch,
    }));
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("Can I export to Roll20?");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => screen.getByText(/couldn't find documented help/));
    await fireEvent.click(screen.getByRole("button", { name: "Graph Basics" }));
    expect(onOpenArticle).toHaveBeenCalledWith("graph-basics");
    expect(screen.queryByTestId("help-action-offer")).toBeNull();
  });

  it("says out-of-scope plainly and offers no action", async () => {
    const off: HelpAnswer = {
      outcome: "out-of-scope",
      answer:
        "I can only help with using Codex Cryptica. Try asking about a feature, a screen, or how to do something in your vault.",
      sources: [],
      action: null,
      suggestions: [],
    };
    const { assistant } = setup(async () => ({ ok: true, answer: off }));
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("What's the weather?");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() =>
      screen.getByText(/only help with using Codex Cryptica/),
    );
    expect(screen.queryByTestId("help-action-offer")).toBeNull();
  });

  it("falls back to static help for the screen when the assistant cannot answer", async () => {
    const { assistant, onOpenArticle } = setup(async () => ({
      ok: false,
      error: { kind: "offline" },
    }));
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("anything");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => screen.getByText(/You're offline/));
    await fireEvent.click(
      screen.getByRole("button", { name: "Connections Tab" }),
    );
    expect(onOpenArticle).toHaveBeenCalledWith("connections-tab");
  });

  it("offers the whole help library when the screen has no specific topic", async () => {
    const assistant = new HelpAssistantStore({
      client: { ask: async () => ({ ok: false, error: { kind: "server" } }) },
      context: { current: context, signature: "s" },
      fallback: () => ({
        message: "Could not reach help.",
        topics: [],
        showLibrary: true,
      }),
      helpIds: () => new Set(),
    });
    const onOpenLibrary = vi.fn();
    render(HelpAssistantPanel, {
      assistant,
      onAccept: vi.fn(),
      onOpenArticle: vi.fn(),
      onOpenLibrary,
      onClose: vi.fn(),
    });
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("anything");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() =>
      screen.getByRole("button", { name: "Open the help library" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Open the help library" }),
    );
    expect(onOpenLibrary).toHaveBeenCalled();
  });

  it("labels an answer that belongs to a screen the user has left", async () => {
    let sig = "a";
    let release!: (r: HelpAskResult) => void;
    const assistant = new HelpAssistantStore({
      client: { ask: () => new Promise<HelpAskResult>((r) => (release = r)) },
      context: {
        get current() {
          return context;
        },
        get signature() {
          return sig;
        },
      },
      fallback: () => ({ message: "x", topics: [], showLibrary: true }),
      helpIds: () => new Set(["connections-tab"]),
    });
    render(HelpAssistantPanel, {
      assistant,
      onAccept: vi.fn(),
      onOpenArticle: vi.fn(),
      onOpenLibrary: vi.fn(),
      onClose: vi.fn(),
    });
    assistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    await type("question");
    await fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    sig = "b";
    release({ ok: true, answer: answered });
    await waitFor(() =>
      screen.getByText(/for the screen you were on when you asked/),
    );
    expect(screen.queryByTestId("help-action-offer")).toBeNull();
  });
});
