import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VaultMessenger } from "./messenger";
import { vaultEventBus } from "./events";

vi.mock("./events", () => ({
  vaultEventBus: {
    subscribe: vi.fn(),
  },
}));

describe("VaultMessenger", () => {
  let messenger: VaultMessenger;
  let deps: any;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let capturedChannel: BroadcastChannel | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUnsubscribe = vi.fn();
    (vaultEventBus.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUnsubscribe,
    );

    // Capture BroadcastChannel instance from constructor
    const OrigBroadcastChannel = global.BroadcastChannel;
    vi.spyOn(global, "BroadcastChannel").mockImplementation(function (
      this: BroadcastChannel,
      name: string,
    ) {
      const real = new OrigBroadcastChannel(name);
      capturedChannel = real;
      return real;
    }) as any;

    deps = {
      activeVaultId: vi.fn().mockReturnValue("vault-1"),
      loadFiles: vi.fn().mockResolvedValue(undefined),
      broadcastCallback: vi.fn(),
    };

    messenger = new VaultMessenger(deps);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subscribes to vaultEventBus on construction", () => {
    expect(vaultEventBus.subscribe).toHaveBeenCalledWith(
      expect.any(Function),
      "vault-update-broadcaster",
    );
  });

  it("creates a BroadcastChannel and sets onmessage handler", () => {
    // The channel is created internally; we verify via broadcastVaultUpdate
    messenger.broadcastVaultUpdate();
    expect(deps.activeVaultId).toHaveBeenCalled();
  });

  it("broadcasts vault update with the active vault id", () => {
    const postMessageSpy = vi.spyOn(capturedChannel!, "postMessage");

    messenger.broadcastVaultUpdate();

    expect(postMessageSpy).toHaveBeenCalledWith({
      type: "RELOAD_VAULT",
      vaultId: "vault-1",
    });
  });

  it("does not broadcast when no active vault id", () => {
    deps.activeVaultId.mockReturnValue(null);
    const postMessageSpy = vi.spyOn(capturedChannel!, "postMessage");

    messenger.broadcastVaultUpdate();

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("loads files on RELOAD_VAULT message matching the active vault", () => {
    expect(capturedChannel?.onmessage).toBeDefined();
    (capturedChannel!.onmessage as any)({
      data: { type: "RELOAD_VAULT", vaultId: "vault-1" },
    });

    expect(deps.loadFiles).toHaveBeenCalled();
  });

  it("ignores RELOAD_VAULT message for a different vault", () => {
    (capturedChannel!.onmessage as any)({
      data: { type: "RELOAD_VAULT", vaultId: "other-vault" },
    });

    expect(deps.loadFiles).not.toHaveBeenCalled();
  });

  it("ignores non-RELOAD_VAULT messages", () => {
    (capturedChannel!.onmessage as any)({
      data: { type: "SOME_OTHER", vaultId: "vault-1" },
    });

    expect(deps.loadFiles).not.toHaveBeenCalled();
  });

  it("calls broadcastCallback on BATCH_CREATED event", () => {
    const subscribeMock = vaultEventBus.subscribe as ReturnType<typeof vi.fn>;
    const listener = subscribeMock.mock.calls[0][0];

    listener({
      type: "BATCH_CREATED",
      vaultId: "vault-1",
      entities: [],
    });

    expect(deps.broadcastCallback).toHaveBeenCalled();
  });

  it("calls broadcastCallback on ENTITY_DELETED event", () => {
    const subscribeMock = vaultEventBus.subscribe as ReturnType<typeof vi.fn>;
    const listener = subscribeMock.mock.calls[0][0];

    listener({
      type: "ENTITY_DELETED",
      vaultId: "vault-1",
      entityId: "some-entity",
    });

    expect(deps.broadcastCallback).toHaveBeenCalled();
  });

  it("closes BroadcastChannel and unsubscribes on destroy", () => {
    const closeSpy = vi.spyOn(capturedChannel!, "close");

    messenger.destroy();

    expect(closeSpy).toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("is safe to call destroy() multiple times", () => {
    messenger.destroy();
    expect(() => messenger.destroy()).not.toThrow();
    // unsubscribe should only be called once
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
