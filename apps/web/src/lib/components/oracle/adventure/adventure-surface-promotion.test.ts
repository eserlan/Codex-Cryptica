import { describe, expect, it, vi } from "vitest";
import type {
  AdventureSession,
  ProvisionalFact,
} from "@codex/adventure-engine";
import { initialSession } from "#lib/stores/oracle/adventure-session.js";
import {
  now,
  startInput,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";
import { AdventureSurfacePromotion } from "./adventure-surface-promotion.js";

const fact: ProvisionalFact = {
  id: "mill",
  kind: "place",
  name: "Old Mill",
  summary: "An abandoned mill.",
  introducedOnTurnId: "turn-1",
  visibility: "player-visible",
};

function setup() {
  const env = {
    session: initialSession({
      ...startInput,
      now,
      idGenerator: () => "session-1",
    }) as AdventureSession | null,
    vaultId: "vault-1",
    ready: true,
    autoPromote: true,
    entities: [] as { id: string; title: string }[],
  };
  const deps = {
    getSession: () => env.session,
    getVaultId: () => env.vaultId,
    getEntities: () => env.entities,
    isReady: () => env.ready,
    isAutoPromote: () => env.autoPromote,
    createEntity: vi.fn(async () => "record-1"),
    linkPlaceRecord: vi.fn(async () => {}),
    notify: vi.fn(),
  };
  return { env, deps, promotions: new AdventureSurfacePromotion(deps) };
}

describe("adventure surface promotion", () => {
  it("creates a player-visible place and ties it to its Vault record", async () => {
    const { promotions, deps } = setup();
    await promotions.add(fact);
    expect(deps.createEntity).toHaveBeenCalledWith(
      "location",
      fact.name,
      expect.objectContaining({
        content: expect.stringContaining(fact.summary),
      }),
    );
    expect(deps.linkPlaceRecord).toHaveBeenCalledWith(fact.name, "record-1");
    expect(deps.notify).toHaveBeenCalledWith(
      "Added Old Mill to Codex.",
      "success",
    );
  });

  it("links existing places by title and tolerates failed best-effort linking", async () => {
    const { env, promotions, deps } = setup();
    env.entities = [{ id: "existing", title: "  OLD MILL  " }];
    deps.linkPlaceRecord.mockRejectedValueOnce(new Error("save failed"));
    await promotions.add(fact);
    expect(deps.createEntity).not.toHaveBeenCalled();
    expect(deps.linkPlaceRecord).toHaveBeenCalledWith(fact.name, "existing");
    expect(deps.notify).toHaveBeenCalledWith(
      "Old Mill is already in Codex.",
      "info",
    );
  });

  it("preserves the existing notification behaviour for a fact name with surrounding spaces", async () => {
    const { env, promotions, deps } = setup();
    env.entities = [{ id: "existing", title: fact.name }];
    await promotions.add({ ...fact, name: " Old Mill " });
    expect(deps.createEntity).not.toHaveBeenCalled();
    expect(deps.linkPlaceRecord).toHaveBeenCalledWith(" Old Mill ", "existing");
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("rejects GM-only facts and requests without an active session", async () => {
    const { env, promotions, deps } = setup();
    await expect(
      promotions.add({ ...fact, visibility: "gm-only" }),
    ).rejects.toThrow("not available to save");
    env.session = null;
    await expect(promotions.add(fact)).rejects.toThrow("No active adventure");
    await expect(promotions.addAll([fact])).rejects.toThrow(
      "No active adventure",
    );
    expect(deps.createEntity).not.toHaveBeenCalled();
  });

  it("reports a successful batch and only links places", async () => {
    const { promotions, deps } = setup();
    await promotions.addAll([
      fact,
      { ...fact, id: "miller", kind: "person", name: "Maren" },
    ]);
    expect(deps.createEntity).toHaveBeenCalledTimes(2);
    expect(deps.linkPlaceRecord).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledWith(
      "Added 2 discoveries to Codex.",
      "success",
    );
  });

  it("stops a batch after a Vault switch without linking to the new session", async () => {
    const { env, promotions, deps } = setup();
    deps.createEntity.mockImplementation(async () => {
      env.vaultId = "vault-2";
      return "record-1";
    });
    await expect(
      promotions.addAll([fact, { ...fact, id: "other" }]),
    ).rejects.toThrow("active adventure changed");
    expect(deps.createEntity).toHaveBeenCalledTimes(1);
    expect(deps.linkPlaceRecord).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("auto-promotes only pending player discoveries and remembers attempts", async () => {
    const { env, promotions, deps } = setup();
    env.session!.provisionalFacts = [
      fact,
      { ...fact, id: "dismissed", name: "Dismissed" },
      { ...fact, id: "secret", visibility: "gm-only" },
      { ...fact, id: "existing", name: "Already saved" },
    ];
    env.session!.dismissedProvisionalFactIds = ["dismissed"];
    await promotions.autoPromote(["Already saved"]);
    await promotions.autoPromote(["Already saved"]);
    expect(deps.createEntity).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledWith(
      "Auto-promoted 1 discovery to Codex.",
      "success",
    );
  });

  it("does not retry failed automatic attempts on every effect run", async () => {
    const { env, promotions, deps } = setup();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    env.session!.provisionalFacts = [fact];
    deps.createEntity.mockRejectedValueOnce(new Error("storage full"));
    await promotions.autoPromote([]);
    await promotions.autoPromote([]);
    expect(deps.createEntity).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("Auto-promote error:", expect.any(Error));
    expect(deps.notify).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("respects disabled auto-promotion and a Vault that has not initialised", async () => {
    const { env, promotions, deps } = setup();
    env.session!.provisionalFacts = [fact];
    env.autoPromote = false;
    await promotions.autoPromote([]);
    env.autoPromote = true;
    env.ready = false;
    await promotions.autoPromote([]);
    expect(deps.createEntity).not.toHaveBeenCalled();
  });
});
