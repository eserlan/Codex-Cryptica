import { describe, it, expect, vi, beforeEach } from "vitest";
import { VaultHandler } from "./vault-handler";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("svelte/store", () => ({
  get: mockGet,
}));

describe("VaultHandler", () => {
  let handler: VaultHandler;
  let mockContext: any;
  let mockConn: any;

  beforeEach(() => {
    mockGet.mockReturnValue({});
    handler = new VaultHandler();
    mockContext = {
      vault: {
        entities: {},
        updateEntity: vi.fn(),
        batchUpdate: vi.fn(),
        deleteEntity: vi.fn(),
      },
      guestRoster: {
        subscribe: vi.fn(),
        update: vi.fn(),
      },
      mapSession: {
        rebindGuestOwnership: vi.fn(),
        clearGuestOwnership: vi.fn(),
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

    expect(mockContext.guestRoster.update).toHaveBeenCalled();
    expect(mockContext.mapSession.rebindGuestOwnership).toHaveBeenCalledWith(
      "g1",
      "Player 1",
    );
  });
});
