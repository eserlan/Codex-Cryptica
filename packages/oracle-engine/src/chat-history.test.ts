import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    await service.init(mockDB, "vault-1");
    expect(service.messages).toEqual([]);
  });

  it("should add a message and save to DB", async () => {
    await service.init(mockDB, "vault-1");
    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);
    expect(service.messages.length).toBe(1);
    expect(service.messages[0].id).toBe("1");
    expect(mockDB.appSettings.put).toHaveBeenCalled();
  });

  it("should remove a message", async () => {
    await service.init(mockDB, "vault-1");
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
    await service.init(mockDB, "vault-1");
    expect(service.messages[0].imageUrl).toBe("restored-url");
    vi.unstubAllGlobals();
  });

  it("should handle removeMessage with blob URL", async () => {
    vi.stubGlobal("URL", { revokeObjectURL: vi.fn() });
    await service.init(mockDB, "vault-1");
    const msg = { id: "1", role: "assistant", imageUrl: "blob:123" } as any;
    await service.addMessage(msg);
    await service.removeMessage("1");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:123");
    vi.unstubAllGlobals();
  });

  it("should strip blob URLs when saving to DB", async () => {
    await service.init(mockDB, "vault-1");
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
    await service.init(mockDB, "vault-1");
    await service.startWizard("connection");
    expect(service.messages[0].type).toBe("wizard");
    expect(service.messages[0].wizardType).toBe("connection");
  });

  it("should update message entity", async () => {
    await service.init(mockDB, "vault-1");
    await service.addMessage({ id: "m1", role: "user", content: "c" } as any);
    service.updateMessageEntity("m1", "e1");
    expect(service.messages[0].archiveTargetId).toBe("e1");
  });

  it("should handle saveToDB error gracefully", async () => {
    await service.init(mockDB, "vault-1");
    mockDB.appSettings.put.mockImplementation(() => {
      throw new Error("IDB fail");
    });

    // Should not throw - errors are silently caught
    await expect(service.addMessage({ id: "1" } as any)).resolves.not.toThrow();
  });

  it("should revoke blob URLs on destroy", async () => {
    vi.stubGlobal("URL", { revokeObjectURL: vi.fn() });
    await service.init(mockDB, "vault-1");

    const msg = { id: "1", role: "assistant", imageUrl: "blob:test123" } as any;
    await service.addMessage(msg);

    service.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test123");
    vi.unstubAllGlobals();
  });

  it("should handle destroy with no blob URLs", async () => {
    await service.init(mockDB, "vault-1");

    const msg = { id: "1", role: "user", content: "hello" } as any;
    await service.addMessage(msg);

    // Should not throw
    expect(() => service.destroy()).not.toThrow();
  });

  it("should save to DB using the per-vault scoped key", async () => {
    await service.init(mockDB, "vault-abc");
    await service.addMessage({
      id: "1",
      role: "user",
      content: "hello",
    } as any);
    const putCall = mockDB.appSettings.put.mock.calls.at(-1)[0];
    expect(putCall.key).toBe("chat_history_vault-abc");
  });

  it("should migrate messages from the legacy flat key on first init", async () => {
    const legacyMessages = [
      { id: "legacy-1", role: "user", content: "old msg" },
    ];
    mockDB.appSettings.get.mockImplementation(async (key: string) => {
      if (key === "chat_history") return { value: legacyMessages };
      return undefined;
    });

    await service.init(mockDB, "vault-1");

    expect(service.messages).toHaveLength(1);
    expect(service.messages[0].id).toBe("legacy-1");
    expect(mockDB.appSettings.put).toHaveBeenCalledWith(
      expect.objectContaining({ key: "chat_history_vault-1" }),
    );
  });

  describe("switchVault", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should flush a pending debounced save before switching vault", async () => {
      await service.init(mockDB, "vault-1");
      const msg = { id: "m1", role: "assistant", content: "c" } as any;
      await service.addMessage(msg);
      mockDB.appSettings.put.mockClear();

      // Trigger debounce (timer not yet fired)
      await service.addProposal("m1", { title: "P1" });
      expect(mockDB.appSettings.put).not.toHaveBeenCalled();

      mockDB.appSettings.get.mockResolvedValue(undefined);
      await service.switchVault("vault-2");

      // Flush must have saved under the OLD vault key
      expect(mockDB.appSettings.put).toHaveBeenCalledWith(
        expect.objectContaining({ key: "chat_history_vault-1" }),
      );
    });

    it("should load messages for the new vault after switching", async () => {
      await service.init(mockDB, "vault-1");
      mockDB.appSettings.get.mockResolvedValue({
        value: [{ id: "m2", role: "user", content: "vault-2 msg" }],
      });

      await service.switchVault("vault-2");

      expect(service.messages).toHaveLength(1);
      expect(service.messages[0].id).toBe("m2");
    });

    it("should revoke blob URLs from the old vault on switch", async () => {
      vi.stubGlobal("URL", {
        revokeObjectURL: vi.fn(),
        createObjectURL: vi.fn(() => "new-url"),
      });

      await service.init(mockDB, "vault-1");
      service.messages = [
        {
          id: "old",
          role: "assistant",
          content: "c",
          imageUrl: "blob:old",
        } as any,
      ];

      mockDB.appSettings.get.mockResolvedValue(undefined);
      await service.switchVault("vault-2");

      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:old");
      vi.unstubAllGlobals();
    });

    it("should only apply results from the last concurrent switch call", async () => {
      await service.init(mockDB, "vault-1");

      // Two rapid switches: vault-2 then vault-3
      let resolveVault2: (v: any) => void;
      const vault2Promise = new Promise((res) => (resolveVault2 = res));
      mockDB.appSettings.get.mockImplementationOnce(() => vault2Promise);
      mockDB.appSettings.get.mockResolvedValue({
        value: [{ id: "v3-msg", role: "user", content: "from vault 3" }],
      });

      const switch2 = service.switchVault("vault-2");
      const switch3 = service.switchVault("vault-3");

      // Resolve vault-2 after vault-3 has already won the sequence
      resolveVault2!({
        value: [{ id: "v2-msg", role: "user", content: "from vault 2" }],
      });

      await Promise.all([switch2, switch3]);

      // vault-3 wins; vault-2 result must be discarded
      expect(service.messages.every((m) => m.id !== "v2-msg")).toBe(true);
    });
  });

  describe("addProposal", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should add proposal to message and debounce persistence", async () => {
      await service.init(mockDB, "vault-1");
      const msg = { id: "m1", role: "assistant", content: "c" } as any;
      await service.addMessage(msg);
      mockDB.appSettings.put.mockClear();

      const proposal = { title: "New NPC", type: "character" };
      await service.addProposal("m1", proposal);

      expect(service.messages[0].proposals).toContainEqual(proposal);
      // Should NOT have saved yet due to debounce
      expect(mockDB.appSettings.put).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(500);
      expect(mockDB.appSettings.put).toHaveBeenCalled();
    });

    it("should ignore duplicate proposals by title", async () => {
      await service.init(mockDB, "vault-1");
      const msg = {
        id: "m1",
        role: "assistant",
        content: "c",
        proposals: [{ title: "Existing NPC" }],
      } as any;
      service.messages = [msg];

      await service.addProposal("m1", { title: "Existing NPC" });
      expect(service.messages[0].proposals!.length).toBe(1);
    });

    it("should clear debounce timeout on destroy", async () => {
      await service.init(mockDB, "vault-1");
      const msg = { id: "m1", role: "assistant", content: "c" } as any;
      await service.addMessage(msg);

      await service.addProposal("m1", { title: "P1" });
      service.destroy();

      vi.advanceTimersByTime(500);
      // Should NOT have saved because destroy clears timeout
      expect(mockDB.appSettings.put).toHaveBeenCalledTimes(1); // Only the initial addMessage call
    });
  });
});
