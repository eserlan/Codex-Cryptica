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
        entities: {},
        updateEntity: vi.fn(),
        batchUpdateEntities: vi.fn(),
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

  it("should handle ENTITY_UPDATE", async () => {
    const msg = {
      type: "ENTITY_UPDATE",
      payload: { id: "e1", title: "New" },
    } as any;
    await handler.handle(msg, mockConn, mockContext);
    expect(mockContext.vault.updateEntity).toHaveBeenCalledWith(
      "e1",
      msg.payload,
    );
  });

  it("should handle GUEST_JOIN", async () => {
    // Mock get(guestRoster) to return empty roster
    vi.mock("svelte/store", () => ({
      get: vi.fn().mockReturnValue({}),
    }));

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
