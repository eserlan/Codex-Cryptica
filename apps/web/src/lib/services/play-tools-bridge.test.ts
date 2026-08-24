/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { PlayToolsBridge } from "./play-tools-bridge";

describe("PlayToolsBridge", () => {
  it("routes VTT_CHAT_MESSAGE to session.sendChatMessage", () => {
    const mockSession = {
      sendChatMessage: vi.fn(),
      sendResolvedRollMessage: vi.fn(),
      vttEnabled: false,
    };

    const listeners: ((e: any) => void)[] = [];
    const mockChannel = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((_type, fn) => listeners.push(fn)),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    } as any;

    const bridge = new PlayToolsBridge(mockChannel);
    const cleanup = bridge.initReceiver(mockSession as any);

    listeners.forEach((l) =>
      l({
        data: {
          type: "VTT_CHAT_MESSAGE",
          content: "Deck of Fates: The Star",
        },
      }),
    );

    expect(mockSession.sendChatMessage).toHaveBeenCalledWith(
      "Deck of Fates: The Star",
    );

    cleanup();
    bridge.destroy();
  });

  it("routes VTT_ROLL_MESSAGE to session.sendResolvedRollMessage when VTT is enabled", () => {
    const mockSession = {
      sendChatMessage: vi.fn(),
      sendResolvedRollMessage: vi.fn(),
      vttEnabled: true,
    };

    const listeners: ((e: any) => void)[] = [];
    const mockChannel = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((_type, fn) => listeners.push(fn)),
      removeEventListener: vi.fn(),
      close: vi.fn(),
    } as any;

    const bridge = new PlayToolsBridge(mockChannel);
    const cleanup = bridge.initReceiver(mockSession as any);

    const rollResult = { total: 18, parts: [] };
    listeners.forEach((l) =>
      l({
        data: {
          type: "VTT_ROLL_MESSAGE",
          formula: "1d20 + 3",
          result: rollResult,
        },
      }),
    );

    expect(mockSession.sendResolvedRollMessage).toHaveBeenCalledWith(
      "1d20 + 3",
      rollResult,
    );

    cleanup();
    bridge.destroy();
  });
});
