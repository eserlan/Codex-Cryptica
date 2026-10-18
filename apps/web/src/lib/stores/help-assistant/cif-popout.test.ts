import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import type { GuidanceAction } from "help-engine";
import {
  parseToHost,
  parseToPopout,
  type CifChannel,
  type HelpAssistantView,
} from "$lib/services/help-assistant/cif-popout-protocol";
import type { HelpStatus } from "./help-assistant.svelte";
import { CifPopoutHost, type PopoutWindow } from "./cif-popout-host.svelte";
import { CifPopoutClient } from "./cif-popout-client.svelte";

/** Two channel ends wired together, like two same-origin windows. */
function channelPair(): [CifChannel, CifChannel] {
  const make = (): CifChannel => ({
    onmessage: null,
    postMessage() {},
    close() {},
  });
  const a = make();
  const b = make();
  // Real channels deliver asynchronously and never to the sender.
  a.postMessage = (m) => queueMicrotask(() => b.onmessage?.({ data: m }));
  b.postMessage = (m) => queueMicrotask(() => a.onmessage?.({ data: m }));
  return [a, b];
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeAssistant() {
  const assistant = {
    isOpen: true,
    status: "idle" as HelpStatus,
    messages: [] as any[],
    offer: null as GuidanceAction | null,
    notice: null as string | null,
    quickPrompts: ["How do I measure distance on the map?"],
    isPending: false,
    ask: vi.fn(async (text: string) => {
      assistant.isPending = true;
      assistant.status = "pending";
      await Promise.resolve();
      assistant.messages = [{ id: 1, role: "user", text }];
      assistant.status = "answered";
      assistant.isPending = false;
      return true;
    }),
    reset: vi.fn(),
    cancel: vi.fn(),
    dismissOffer: vi.fn(),
    close: vi.fn(() => {
      assistant.isOpen = false;
    }),
  };
  return assistant satisfies HelpAssistantView & { close(): void };
}

describe("Cif pop-out messages", () => {
  it("accepts well-formed messages only", () => {
    expect(parseToHost({ type: "ask", id: 1, text: "hi" })).toEqual({
      type: "ask",
      id: 1,
      text: "hi",
    });
    expect(parseToHost({ type: "ask", id: "1", text: "hi" })).toBeNull();
    expect(parseToHost({ type: "open-article" })).toBeNull();
    expect(parseToHost({ type: "delete-vault" })).toBeNull();
    expect(parseToHost("accept")).toBeNull();
    expect(
      parseToPopout({ type: "snapshot", snapshot: { messages: 3 } }),
    ).toBeNull();
    expect(parseToPopout({ type: "nope" })).toBeNull();
  });
});

describe("Cif pop-out host and client", () => {
  let assistant: ReturnType<typeof fakeAssistant>;
  let host: CifPopoutHost;
  let client: CifPopoutClient;
  let deps: {
    accept: Mock<(action: GuidanceAction) => Promise<void>>;
    openArticle: Mock<(helpId: string) => void>;
    openLibrary: Mock<() => void>;
    openWindow: Mock<() => PopoutWindow | null>;
  };
  let win: { closed: boolean; focus: Mock<() => void> };

  beforeEach(() => {
    const [hostEnd, popoutEnd] = channelPair();
    assistant = fakeAssistant();
    win = { closed: false, focus: vi.fn<() => void>() };
    deps = {
      accept: vi.fn(async () => {}),
      openArticle: vi.fn(),
      openLibrary: vi.fn(),
      openWindow: vi.fn<() => PopoutWindow | null>(() => win),
    };
    host = new CifPopoutHost({
      assistant,
      createChannel: () => hostEnd,
      ...deps,
    });
    client = new CifPopoutClient(popoutEnd);
    host.start();
    client.start();
  });

  it("shows the conversation in the window and docks the panel away", async () => {
    await flush();

    expect(host.connected).toBe(true);
    expect(client.connected).toBe(true);
    expect(client.quickPrompts).toEqual([
      "How do I measure distance on the map?",
    ]);
    expect(assistant.close).toHaveBeenCalled();
  });

  it("asks through the main window and reports whether it was sent", async () => {
    await flush();

    expect(await client.ask("Where is the fog toggle?")).toBe(true);
    expect(assistant.ask).toHaveBeenCalledWith("Where is the fog toggle?");

    assistant.ask.mockResolvedValueOnce(false);
    expect(await client.ask("x".repeat(10))).toBe(false);
  });

  it("acknowledges an accepted question before its answer is ready", async () => {
    let finishRequest!: (started: boolean) => void;
    assistant.ask.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishRequest = resolve;
          assistant.status = "pending";
          assistant.isPending = true;
        }),
    );

    expect(await client.ask("A slow question")).toBe(true);
    expect(assistant.status).toBe("pending");
    finishRequest(true);
  });

  it("follows later changes to the conversation", async () => {
    await flush();
    assistant.messages = [{ id: 7, role: "user", text: "hello" }];
    host.publish();
    await flush();

    expect(client.messages.map((m) => m.id)).toEqual([7]);
  });

  it("runs commands in the main window", async () => {
    await flush();
    client.reset();
    client.cancel();
    client.dismissOffer();
    client.openArticle("vtt-session");
    client.openLibrary();
    await flush();

    expect(assistant.reset).toHaveBeenCalled();
    expect(assistant.cancel).toHaveBeenCalled();
    expect(assistant.dismissOffer).toHaveBeenCalled();
    expect(deps.openArticle).toHaveBeenCalledWith("vtt-session");
    expect(deps.openLibrary).toHaveBeenCalled();
  });

  it("runs the offer the main window holds, and nothing without one", async () => {
    await flush();
    client.accept();
    await flush();
    expect(deps.accept).not.toHaveBeenCalled();

    const offer = {
      type: "navigate",
      to: "map",
      label: "Open Maps",
    } as GuidanceAction;
    assistant.offer = offer;
    client.accept();
    await flush();
    expect(deps.accept).toHaveBeenCalledWith(offer);
  });

  it("ignores a question when the window is not connected", async () => {
    const [, lonelyEnd] = channelPair();
    const lonely = new CifPopoutClient(lonelyEnd);

    expect(await lonely.ask("anyone there?")).toBe(false);
  });

  it("stops being connected when the window says goodbye or the host closes", async () => {
    await flush();
    client.stop();
    await flush();
    expect(host.connected).toBe(false);

    host.stop();
    await flush();
    expect(client.connected).toBe(false);
  });

  it("opens one window and brings it forward instead of opening a second", () => {
    host.open();
    host.open();

    expect(deps.openWindow).toHaveBeenCalledTimes(1);
    expect(win.focus).toHaveBeenCalledTimes(1);

    win.closed = true;
    host.open();
    expect(deps.openWindow).toHaveBeenCalledTimes(2);
  });

  it("is unsupported without a channel, and does nothing", () => {
    const bare = new CifPopoutHost({
      assistant,
      createChannel: () => null,
      ...deps,
    });
    bare.start();

    expect(bare.supported).toBe(false);
    expect(() => bare.publish()).not.toThrow();
  });

  it("sends the pop-out only the conversation, never the screen context", async () => {
    const [hostEnd, spyEnd] = channelPair();
    const sent: any[] = [];
    spyEnd.onmessage = (event) => sent.push(event.data);
    const spied = new CifPopoutHost({
      assistant,
      createChannel: () => hostEnd,
      ...deps,
    });
    spied.start();
    spyEnd.postMessage({ type: "hello" });
    await flush();

    const snapshot = sent.find((m) => m.type === "snapshot").snapshot;
    expect(Object.keys(snapshot).sort()).toEqual([
      "isPending",
      "messages",
      "notice",
      "offer",
      "quickPrompts",
      "status",
    ]);
  });
});
