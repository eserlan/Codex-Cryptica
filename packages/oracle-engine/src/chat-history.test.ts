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
      appSettings: {
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
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
    expect(mockDB.appSettings.put).toHaveBeenCalled();
  });

  it("should remove a message", async () => {
    await service.init(mockDB);
    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);
    await service.removeMessage("1");
    expect(service.messages.length).toBe(0);
  });

  it("should initialize and restore blob URLs", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "restored-url") });
    mockDB.appSettings.get.mockResolvedValue({
      value: [
        { id: "1", role: "assistant", imageBlob: new Blob([]), content: "img" },
      ],
    });
    await service.init(mockDB);
    expect(service.messages[0].imageUrl).toBe("restored-url");
    vi.unstubAllGlobals();
  });

  it("should handle removeMessage with blob URL", async () => {
    vi.stubGlobal("URL", { revokeObjectURL: vi.fn() });
    await service.init(mockDB);
    const msg = { id: "1", role: "assistant", imageUrl: "blob:123" } as any;
    await service.addMessage(msg);
    await service.removeMessage("1");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:123");
    vi.unstubAllGlobals();
  });

  it("should strip blob URLs when saving to DB", async () => {
    await service.init(mockDB);
    const msg = {
      id: "1",
      role: "assistant",
      imageUrl: "blob:123",
      content: "c",
    } as any;

    await service.addMessage(msg);

    const putCall = mockDB.appSettings.put.mock.calls[0][0];
    expect(putCall.value[0].imageUrl).toBeUndefined();
  });

  it("should start wizard", async () => {
    await service.init(mockDB);
    await service.startWizard("connection");
    expect(service.messages[0].type).toBe("wizard");
    expect(service.messages[0].wizardType).toBe("connection");
  });

  it("should update message entity", async () => {
    await service.init(mockDB);
    await service.addMessage({ id: "m1", role: "user", content: "c" } as any);
    service.updateMessageEntity("m1", "e1");
    expect(service.messages[0].archiveTargetId).toBe("e1");
  });

  it("should handle saveToDB error gracefully", async () => {
    await service.init(mockDB);
    mockDB.appSettings.put.mockImplementation(() => {
      throw new Error("IDB fail");
    });

    // Should not throw - errors are silently caught
    await expect(service.addMessage({ id: "1" } as any)).resolves.not.toThrow();
  });

  it("should revoke blob URLs on destroy", async () => {
    vi.stubGlobal("URL", { revokeObjectURL: vi.fn() });
    await service.init(mockDB);
    
    const msg = { id: "1", role: "assistant", imageUrl: "blob:test123" } as any;
    await service.addMessage(msg);
    
    service.destroy();
    
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test123");
    vi.unstubAllGlobals();
  });

  it("should handle destroy with no blob URLs", async () => {
    await service.init(mockDB);
    
    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);
    
    // Should not throw
    expect(() => service.destroy()).not.toThrow();
  });
});
