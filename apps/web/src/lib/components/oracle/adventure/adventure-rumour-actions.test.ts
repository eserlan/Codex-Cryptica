import { describe, expect, it, vi } from "vitest";
import type { PendingAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
import type { AdventureSession, ScenarioItem } from "@codex/adventure-engine";
import { AdventureStartDraft } from "./adventure-start-draft.svelte.js";
import { AdventureRumourActions } from "./adventure-rumour-actions.svelte.js";

const pending: PendingAdventureHandoff = {
  vaultId: "vault-1",
  sourceGeneratorId: "rumour",
  selected: {
    batchTitle: "Around Town",
    index: 2,
    origin: { kind: "rumour", batchTitle: "Around Town", index: 2 },
    playerVisible: {
      rumour: "The miller vanished.",
      lead: "Old Mill",
      source: "Inn",
    },
    gmOnly: {
      reality: "exaggeration",
      whatsActuallyHappening: "He is hiding grain.",
      ifInvestigated: "Footprints.",
    },
  },
  scenario: {
    version: 1,
    id: "scenario-1",
    origin: { kind: "rumour", batchTitle: "Around Town", index: 2 },
    playerVisible: { rumour: "The miller vanished.", lead: "Old Mill" },
    gmOnly: { truth: "He is hiding grain." },
    status: "open",
    stage: "hearsay",
    events: [],
  },
};

function setup() {
  const draft = new AdventureStartDraft();
  draft.prefillRumour(pending);
  const manager = {
    session: { id: "active" } as AdventureSession | null,
    readOnly: false,
    end: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    addScenario: vi.fn(async (_item: ScenarioItem) => {}),
  };
  const handoff = {
    forVault: vi.fn((): PendingAdventureHandoff | null => pending),
    clear: vi.fn(),
    cancel: vi.fn(() => true),
  };
  const openGenerator = vi.fn();
  const actions = new AdventureRumourActions({
    manager,
    handoff,
    draft,
    getVaultId: () => "vault-1",
    openGenerator,
  });
  return { draft, manager, handoff, openGenerator, actions };
}

describe("adventure rumour actions", () => {
  it("adds a cloned scenario with fresh secret bindings before clearing the handoff", async () => {
    const { actions, manager, handoff } = setup();
    await actions.add();
    const item = manager.addScenario.mock.calls[0][0];
    expect(item).toMatchObject({
      ...pending.scenario,
      knowledge: "heard",
      anchorRefs: [],
      revealedSecretIds: [],
    });
    expect(item).not.toBe(pending.scenario);
    expect(item.secretBindings.truth).not.toBe(
      item.secretBindings.ifInvestigated,
    );
    expect(handoff.clear).toHaveBeenCalledOnce();
    expect(actions.error).toBeNull();
  });

  it("retains the handoff and shows safe copy when adding fails", async () => {
    const { actions, manager, handoff } = setup();
    manager.addScenario.mockRejectedValueOnce(
      new Error("state-budget-exceeded"),
    );
    await actions.add();
    expect(actions.error).toContain("The adventure is unchanged.");
    expect(actions.error).not.toContain("state-budget-exceeded");
    expect(handoff.clear).not.toHaveBeenCalled();
  });

  it("ignores add and archive actions in a read-only session", async () => {
    const { actions, manager } = setup();
    manager.readOnly = true;
    await actions.add();
    await actions.archive();
    expect(manager.addScenario).not.toHaveBeenCalled();
    expect(manager.end).not.toHaveBeenCalled();
  });

  it("does not add without a pending rumour or active session", async () => {
    const { actions, manager, handoff } = setup();
    manager.session = null;
    await actions.add();
    handoff.forVault.mockReturnValue(null);
    await actions.add();
    expect(manager.addScenario).not.toHaveBeenCalled();
  });

  it("archives before closing and blocks a concurrent archive", async () => {
    const { actions, manager } = setup();
    let finish!: () => void;
    manager.end.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const archiving = actions.archive();
    await actions.archive();
    expect(manager.end).toHaveBeenCalledOnce();
    expect(manager.close).not.toHaveBeenCalled();
    finish();
    await archiving;
    expect(manager.close).toHaveBeenCalledOnce();
    expect(actions.archiving).toBe(false);
  });

  it("keeps the current adventure when archiving fails", async () => {
    const { actions, manager } = setup();
    manager.end.mockRejectedValueOnce(new Error("save failed"));
    await actions.archive();
    expect(actions.error).toContain("It has not been replaced.");
    expect(manager.close).not.toHaveBeenCalled();
    expect(actions.archiving).toBe(false);
  });

  it("cancels to the original generator batch while retaining character selections", () => {
    const { actions, draft, handoff, openGenerator } = setup();
    draft.characterId = "lira";
    actions.cancel();
    expect(handoff.cancel).toHaveBeenCalledWith("vault-1");
    expect(openGenerator).toHaveBeenCalledWith("rumour");
    expect(draft.title).toBe("");
    expect(draft.premise).toBe("");
    expect(draft.approach).toBe("choose");
    expect(draft.characterId).toBe("lira");
  });

  it("does not open a generator when no source batch remains", () => {
    const { actions, handoff, openGenerator } = setup();
    handoff.cancel.mockReturnValueOnce(false);
    actions.cancel();
    expect(openGenerator).not.toHaveBeenCalled();
  });
});
