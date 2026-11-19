import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import type { AdventureSession } from "@codex/adventure-engine";
import type { AdventureStartFailure } from "#lib/services/adventure/adventure-start-failure.js";
import { initialSession } from "#lib/stores/oracle/adventure-session.js";
import {
  now,
  startInput,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";
import { AdventureWorldEntry } from "./adventure-world-entry.svelte.js";

function setup() {
  const manager = {
    starting: false,
    session: null as AdventureSession | null,
    errorCause: null as AdventureStartFailure | null,
    readOnly: false,
    start: vi.fn(async (_input: unknown) => {}),
  };
  const env = { vaultId: "vault-1", aiDisabled: false, online: true };
  const deps = {
    manager,
    getVaultId: () => env.vaultId,
    getEntities: () => [],
    getCharacters: () => [],
    getLocations: () => [],
    getCalendar: () => DEFAULT_CALENDAR,
    getPrecheck: () => env,
    onReview: vi.fn(),
    onStarted: vi.fn(),
  };
  const world = new AdventureWorldEntry(deps);
  world.reset("vault-1");
  world.setup.provisionalCharacterName = "Lira";
  world.setup.provisionalLocationName = "Old Mill";
  return { world, env, deps, manager };
}

function committedSession(): AdventureSession {
  const session = initialSession({
    ...startInput,
    now,
    idGenerator: () => "session-1",
  });
  // A pending opening roll is a committed opening, without requiring a full turn fixture.
  session.pendingRoll = {} as NonNullable<AdventureSession["pendingRoll"]>;
  return session;
}

describe("adventure world entry", () => {
  it("reviews the draft and starts with a plain cloneable payload", async () => {
    const { world, manager, deps } = setup();
    world.review(world.setup);
    expect(world.preview).not.toBeNull();
    expect(deps.onReview).toHaveBeenCalledOnce();
    manager.start.mockImplementation(async (input) => {
      expect(() => structuredClone(input)).not.toThrow();
      expect(input).toMatchObject({
        vaultId: "vault-1",
        playerCharacter: { name: "Lira" },
        worldEntry: { location: { name: "Old Mill" } },
      });
      manager.session = committedSession();
    });
    await world.start();
    expect(deps.onStarted).toHaveBeenCalledOnce();
    expect(world.setup.provisionalCharacterName).toBe("");
    expect(world.preview).toBeNull();
    expect(world.busy).toBe(false);
  });

  it.each(["ai-disabled", "offline"])(
    "preserves the draft when %s blocks starting",
    async (mode) => {
      const { world, env, manager } = setup();
      env.aiDisabled = mode === "ai-disabled";
      env.online = mode !== "offline";
      await world.start();
      expect(world.error).toContain(
        mode === "ai-disabled" ? "AI Disabled" : "internet",
      );
      expect(world.setup.provisionalCharacterName).toBe("Lira");
      expect(manager.start).not.toHaveBeenCalled();
    },
  );

  it("keeps invalid setup errors and failed opening copy on the same draft", async () => {
    const { world, manager, deps } = setup();
    world.setup.provisionalCharacterName = "";
    await world.start();
    expect(world.error).toContain("character");
    expect(manager.start).not.toHaveBeenCalled();
    world.setup.provisionalCharacterName = "Lira";
    manager.errorCause = "save-failed";
    await world.start();
    expect(world.error).toContain("could not be saved");
    expect(world.setup.provisionalCharacterName).toBe("Lira");
    expect(deps.onStarted).not.toHaveBeenCalled();
  });

  it("blocks overlapping launches and ignores a launch completed after a Vault reset", async () => {
    const { world, env, manager, deps } = setup();
    let finish!: () => void;
    manager.start.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const launching = world.start();
    await world.start();
    expect(manager.start).toHaveBeenCalledTimes(1);
    env.vaultId = "vault-2";
    world.reset(env.vaultId);
    world.setup.provisionalCharacterName = "New character";
    manager.session = committedSession();
    finish();
    await launching;
    expect(world.setup.vaultId).toBe("vault-2");
    expect(world.setup.provisionalCharacterName).toBe("New character");
    expect(world.error).toBeNull();
    expect(world.busy).toBe(false);
    expect(deps.onStarted).not.toHaveBeenCalled();
  });

  it("reports a rejected launch and permits a retry", async () => {
    const { world, manager } = setup();
    manager.start.mockRejectedValueOnce(new Error("unexpected"));
    await world.start();
    expect(world.error).not.toContain("unexpected");
    expect(world.error).toBeTruthy();
    expect(world.busy).toBe(false);
    await world.start();
    expect(manager.start).toHaveBeenCalledTimes(2);
  });
});
