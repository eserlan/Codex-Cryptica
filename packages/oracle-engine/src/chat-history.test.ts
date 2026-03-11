import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatHistoryService } from "./chat-history.svelte";

describe("ChatHistoryService", () => {
  let service: ChatHistoryService;
  let mockDB: any;

  beforeEach(() => {
    vi.stubGlobal(
      "BroadcastChannel",
      vi.fn().mockImplementation(
        class {
          postMessage = vi.fn();
          onmessage = null;
        },
      ),
    );

    service = new ChatHistoryService();
    mockDB = {
      getAll: vi.fn().mockResolvedValue([]),
      transaction: vi.fn().mockReturnValue({
        store: {
          clear: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
        },
        done: Promise.resolve(),
      }),
    };
  });

  it("should initialize with empty messages", async () => {
    await service.init(mockDB);
    expect(service.messages).toEqual([]);
  });

  it("should add a message and save to DB", async () => {
    await service.init(mockDB);
    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);
    expect(service.messages.length).toBe(1);
    expect(service.messages[0].id).toBe("1");
    expect(mockDB.transaction).toHaveBeenCalledWith(
      "chat_history",
      "readwrite",
    );
  });

  it("should remove a message", async () => {
    await service.init(mockDB);
    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);
    await service.removeMessage("1");
    expect(service.messages.length).toBe(0);
  });

  it("should clear messages", async () => {
    await service.init(mockDB);
    await service.addMessage({
      id: "1",
      role: "user",
      content: "hello",
    } as any);
    await service.clearMessages();
    expect(service.messages.length).toBe(0);
  });
});
