import { describe, it, expect, vi, beforeEach } from "vitest";
import { VaultHandler } from "./vault-handler";

describe("VaultHandler", () => {
  let handler: VaultHandler;
  let mockContext: any;
  let mockConn: any;

  beforeEach(() => {
    handler = new VaultHandler();
    mockContext = {
      vault: {
        entities: {
          e1: {
            id: "e1",
            title: "Shared NPC",
            type: "character",
            content: "Known to the party.",
            visibleToGuests: true,
          },
        },
        defaultVisibility: false,
        updateEntity: vi.fn(),
        batchUpdate: vi.fn(),
        deleteEntity: vi.fn(),
      },
      guestStore: {
        guestRoster: {},
      },
      mapSession: {
        rebindGuestOwnership: vi.fn(),
        clearGuestOwnership: vi.fn(),
        mapId: null,
        vttEnabled: false,
      },
      mapStore: {
        activeMap: null,
      },
      transport: { broadcast: vi.fn() },
      themeStore: { currentThemeId: "dark" },
    };
    mockConn = { peer: "g1", send: vi.fn(), close: vi.fn() };
  });

  it("should not accept inbound host-owned entity mutations", async () => {
    expect(handler.canHandle({ type: "ENTITY_UPDATE" } as any)).toBe(false);
    expect(handler.canHandle({ type: "ENTITY_BATCH_UPDATE" } as any)).toBe(
      false,
    );
    expect(handler.canHandle({ type: "ENTITY_DELETE" } as any)).toBe(false);

    await handler.handle(
      { type: "ENTITY_UPDATE", payload: { id: "e1", title: "New" } } as any,
      mockConn,
      mockContext,
    );

    expect(mockContext.vault.updateEntity).not.toHaveBeenCalled();
    expect(mockContext.vault.batchUpdate).not.toHaveBeenCalled();
    expect(mockContext.vault.deleteEntity).not.toHaveBeenCalled();
  });

  it("should handle GUEST_JOIN", async () => {
    const msg = {
      type: "GUEST_JOIN",
      payload: { displayName: "Player 1" },
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockContext.guestStore.guestRoster["g1"]).toBeDefined();
    expect(mockContext.guestStore.guestRoster["g1"].displayName).toBe(
      "Player 1",
    );
    expect(mockContext.mapSession.rebindGuestOwnership).toHaveBeenCalledWith(
      "g1",
      "Player 1",
    );
    expect(mockConn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GRAPH_SYNC",
        payload: expect.objectContaining({
          entities: expect.objectContaining({
            e1: expect.objectContaining({ title: "Shared NPC" }),
          }),
        }),
      }),
    );
  });

  it("should handle GUEST_CHAT_TRANSCRIPT_SYNC", async () => {
    mockContext.vault.saveTranscript = vi.fn();
    const payload = {
      id: "g1_c1",
      guestId: "g1",
      guestName: "Guest",
      characterId: "c1",
      characterTitle: "NPC",
      messages: [{ id: "m1", role: "user", content: "hello", timestamp: 123 }],
      lastUpdated: 456,
    };
    const msg = {
      type: "GUEST_CHAT_TRANSCRIPT_SYNC",
      payload,
    } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockContext.vault.saveTranscript).toHaveBeenCalledWith(payload);
  });
});
