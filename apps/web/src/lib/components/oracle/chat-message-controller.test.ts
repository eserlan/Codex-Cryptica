import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ORACLE_EVENTS } from "@codex/oracle-engine";
import { ChatMessageController } from "./chat-message-controller.svelte";

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("dompurify", () => ({
  default: { sanitize: vi.fn((html: string) => html) },
}));
vi.mock("@codex/events", () => ({
  appEventBus: { subscribe: vi.fn() },
}));
vi.mock("$lib/services/ClipboardService", () => ({
  clipboardService: { copyHtmlAndText: vi.fn() },
}));
vi.mock("$lib/services/parser", () => ({
  parserService: { parse: vi.fn() },
}));
vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: { pendingDraft: null },
}));
vi.mock("$lib/stores/graph.svelte", () => ({
  graph: {},
}));
vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: { updateMessageEntity: vi.fn() },
}));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false, entities: {} },
}));
vi.mock("./chat-message.actions", () => ({
  ChatMessageActions: vi.fn(),
}));

describe("ChatMessageController", () => {
  let oracle: any;
  let vault: any;
  let parserService: any;
  let clipboardService: any;
  let domPurify: any;
  let appEventBus: any;
  let revisionService: any;
  let actions: any;

  beforeEach(() => {
    vi.useFakeTimers();
    oracle = {
      updateMessageEntity: vi.fn().mockResolvedValue(undefined),
    };
    vault = {
      isGuest: false,
      entities: {
        existing: { id: "existing", title: "Existing" },
      },
    };
    parserService = {
      parse: vi.fn().mockResolvedValue("<p>Rendered</p>"),
    };
    clipboardService = {
      copyHtmlAndText: vi.fn().mockResolvedValue(true),
    };
    domPurify = {
      sanitize: vi
        .fn()
        .mockImplementation((html: string) =>
          html.replace("Rendered", "Clean"),
        ),
    };
    appEventBus = {
      subscribe: vi.fn().mockReturnValue(vi.fn()),
    };
    revisionService = {
      pendingDraft: null,
    };
    actions = {
      applySmart: vi.fn().mockImplementation(({ setSaved }) => setSaved(true)),
      createAsNode: vi
        .fn()
        .mockImplementation(({ setSaved }) => setSaved(true)),
      copyToChronicle: vi
        .fn()
        .mockImplementation(({ setSaved }) => setSaved(true)),
      copyToLore: vi.fn().mockImplementation(({ setSaved }) => setSaved(true)),
      undo: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createController() {
    return new ChatMessageController({
      oracle,
      vault,
      parserService,
      clipboardService,
      domPurify,
      appEventBus,
      revisionService,
      browser: true,
      actions,
    });
  }

  it("renders, sanitizes, and caches message html", async () => {
    const controller = createController();

    await controller.renderContent({ content: "hello" });
    await controller.renderContent({ content: "hello" });

    expect(parserService.parse).toHaveBeenCalledTimes(1);
    expect(parserService.parse).toHaveBeenCalledWith("hello");
    expect(domPurify.sanitize).toHaveBeenCalledWith("<p>Rendered</p>", {
      ALLOWED_URI_REGEXP: expect.any(RegExp),
    });
    expect(controller.htmlCache).toBe("<p>Clean</p>");
  });

  it("copies cached rich text and resets copied state", async () => {
    const controller = createController();
    await controller.renderContent({ content: "raw markdown" });

    await controller.copyToClipboard({ content: "raw markdown" });

    expect(clipboardService.copyHtmlAndText).toHaveBeenCalledWith(
      "<p>Clean</p>",
      "raw markdown",
    );
    expect(parserService.parse).toHaveBeenCalledTimes(1);
    expect(controller.isCopied).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(controller.isCopied).toBe(false);
  });

  it("re-renders clipboard html when cached content is stale", async () => {
    const controller = createController();
    parserService.parse
      .mockResolvedValueOnce("<p>Old Rendered</p>")
      .mockResolvedValueOnce("<p>Fresh Rendered</p>");

    await controller.renderContent({ content: "old markdown" });
    await controller.copyToClipboard({ content: "fresh markdown" });

    expect(parserService.parse).toHaveBeenCalledTimes(2);
    expect(parserService.parse).toHaveBeenLastCalledWith("fresh markdown");
    expect(clipboardService.copyHtmlAndText).toHaveBeenCalledWith(
      "<p>Fresh Clean</p>",
      "fresh markdown",
    );
  });

  it("subscribes to undo events, clears matching saved state, and cleans up on destroy", () => {
    const controller = createController();
    const unsubscribe = vi.fn();
    appEventBus.subscribe.mockReturnValue(unsubscribe);
    controller.isSaved = true;

    controller.subscribeToUndo({ id: "message-1" });
    const listener = appEventBus.subscribe.mock.calls[0][1];
    listener({
      type: ORACLE_EVENTS.UNDO_PERFORMED,
      payload: { messageId: "other" },
    });
    expect(controller.isSaved).toBe(true);

    listener({
      type: ORACLE_EVENTS.UNDO_PERFORMED,
      payload: { messageId: "message-1" },
    });
    expect(controller.isSaved).toBe(false);

    controller.destroy();
    controller.destroy();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("consumes selected entity links and resets selection state", async () => {
    const controller = createController();
    controller.selectedEntityId = "target";
    controller.isSelectingEntity = true;

    await controller.consumeSelectedEntity({ id: "message-2" });

    expect(oracle.updateMessageEntity).toHaveBeenCalledWith(
      "message-2",
      "target",
    );
    expect(controller.selectedEntityId).toBeNull();
    expect(controller.isSelectingEntity).toBe(false);
  });

  it("deduplicates visible discovery proposals and filters guest-only entities", () => {
    const controller = createController();
    const proposals = [
      { title: "Existing", entityId: "existing", confidence: 0.9 },
      { title: "Existing", entityId: "existing", confidence: 0.8 },
      { title: "Missing", entityId: "missing", confidence: 0.9 },
      { title: "New", entityId: null, confidence: 0.9 },
    ];

    expect(
      controller.getVisibleProposals({ proposals } as any).map((p) => p.title),
    ).toEqual(["Existing", "Missing", "New"]);

    vault.isGuest = true;
    expect(
      controller.getVisibleProposals({ proposals } as any).map((p) => p.title),
    ).toEqual(["Existing"]);
  });

  it("wraps message actions with active and saved state", async () => {
    const controller = createController();

    await controller.applySmart({
      message: { id: "message-3", content: "content" } as any,
      parsed: { title: "Title" },
      activeEntityId: "existing",
    });

    expect(actions.applySmart).toHaveBeenCalled();
    expect(controller.isSaved).toBe(true);
    expect(controller.activeAction).toBeNull();
  });
});
