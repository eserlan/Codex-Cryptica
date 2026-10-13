import { describe, expect, it, vi } from "vitest";
import type { Milestone } from "onboarding-journey-engine";
import type { VaultEvent } from "$lib/stores/vault/events.svelte";
import { SEARCH_ENTITY_FOCUS_EVENT } from "$lib/components/search/search-focus";
import { JourneyMilestones } from "./journey-milestones";

/** A payload that throws if anything but the allowed fields is read. */
function guarded<T extends object>(value: T, allowed: string[]): T {
  return new Proxy(value, {
    get(target, key, receiver) {
      if (typeof key === "string" && !allowed.includes(key)) {
        throw new Error(`read forbidden field ${key}`);
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

function setup() {
  let activeVaultId: string | null = "v1";
  let vaultListener: ((e: VaultEvent) => void) | null = null;
  let appListener: ((e: { payload?: unknown }) => void) | null = null;
  const offVault = vi.fn();
  const offApp = vi.fn();
  const target = new EventTarget();
  const milestones = new JourneyMilestones({
    vaultBus: {
      subscribe: (l) => {
        vaultListener = l;
        return offVault;
      },
    },
    appBus: {
      subscribe: (_f, l) => {
        appListener = l;
        return offApp;
      },
    },
    target,
    clock: { now: () => 500 },
    activeVaultId: () => activeVaultId,
  });
  const seen: Milestone[] = [];
  const stop = milestones.start((m) => seen.push(m));
  return {
    milestones,
    seen,
    stop,
    offVault,
    offApp,
    target,
    vault: (e: VaultEvent) => vaultListener?.(e),
    app: (e: { payload?: unknown }) => appListener?.(e),
    setActiveVaultId: (id: string | null) => (activeVaultId = id),
  };
}

describe("JourneyMilestones", () => {
  it("emits one entry-created per distinct category in the active vault", () => {
    const t = setup();
    const entity = (type: string) =>
      guarded({ type, title: "Secret", id: "e1", content: "x" }, ["type"]);
    t.vault(
      guarded(
        {
          type: "BATCH_CREATED",
          vaultId: "v1",
          entities: [
            entity("location"),
            entity("character"),
            entity("location"),
          ],
        },
        ["type", "vaultId", "entities"],
      ) as VaultEvent,
    );
    expect(t.seen).toEqual([
      { kind: "entry-created", category: "location", at: 500 },
      { kind: "entry-created", category: "character", at: 500 },
    ]);
  });

  it("emits connection-added without reading ids, type or label", () => {
    const t = setup();
    t.vault(
      guarded(
        {
          type: "CONNECTION_ADDED",
          vaultId: "v1",
          sourceId: "a",
          targetId: "b",
          connectionType: "rival",
          label: "Rival",
        },
        ["type", "vaultId"],
      ) as VaultEvent,
    );
    expect(t.seen).toEqual([{ kind: "connection-added", at: 500 }]);
  });

  it("ignores entity and connection events from another vault", () => {
    const t = setup();
    t.setActiveVaultId("v2");
    t.vault({
      type: "BATCH_CREATED",
      vaultId: "v1",
      entities: [{ type: "location" }] as never,
    });
    t.vault({
      type: "CONNECTION_ADDED",
      vaultId: "v1",
      sourceId: "a",
      targetId: "b",
      connectionType: "rival",
    });
    expect(t.seen).toEqual([]);
  });

  it("emits generator-saved for a generator save and nothing for other journal entries", () => {
    const t = setup();
    t.app({
      payload: guarded(
        { entryType: "generated-saved", content: "Saved Mira" },
        ["entryType"],
      ),
    });
    t.app({ payload: { entryType: "dice-roll" } });
    t.app({});
    expect(t.seen).toEqual([{ kind: "generator-saved", at: 500 }]);
  });

  it("emits entry-found for a search focus without reading the entity id", () => {
    const t = setup();
    t.target.dispatchEvent(
      new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT, {
        detail: guarded({ entityId: "e1" }, []),
      }),
    );
    t.milestones.recordEntryFound();
    expect(t.seen).toEqual([
      { kind: "entry-found", at: 500 },
      { kind: "entry-found", at: 500 },
    ]);
  });

  it("ignores deletes and other vault events", () => {
    const t = setup();
    t.vault({ type: "ENTITY_DELETED", vaultId: "v1", entityId: "e1" });
    t.vault({
      type: "CONNECTION_REMOVED",
      vaultId: "v1",
      sourceId: "a",
      targetId: "b",
      connectionType: "x",
    });
    t.vault({ type: "VAULT_SWITCHED", vaultId: "v2" });
    expect(t.seen).toEqual([]);
  });

  it("stops every source on dispose", () => {
    const t = setup();
    t.stop();
    expect(t.offVault).toHaveBeenCalled();
    expect(t.offApp).toHaveBeenCalled();
    t.target.dispatchEvent(new CustomEvent(SEARCH_ENTITY_FOCUS_EVENT));
    t.milestones.recordEntryFound();
    expect(t.seen).toEqual([]);
  });
});
