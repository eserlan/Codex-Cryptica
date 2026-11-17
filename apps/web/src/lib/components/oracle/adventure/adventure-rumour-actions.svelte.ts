import type { ScenarioItem } from "@codex/adventure-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import type { RumourAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
import { describeScenarioMutationError } from "#lib/stores/oracle/adventure-scenarios.js";
import type { AdventureStartDraft } from "./adventure-start-draft.svelte.js";

interface RumourDependencies {
  manager: Pick<AdventureManager, "session" | "readOnly" | "end" | "close"> & {
    addScenario: (item: ScenarioItem) => Promise<unknown>;
  };
  handoff: Pick<RumourAdventureHandoff, "forVault" | "clear" | "cancel">;
  draft: AdventureStartDraft;
  getVaultId: () => string;
  openGenerator: (generatorId: "rumour" | "adventure") => void;
}

/** Resolve a prepared scenario's handoff to an existing or new adventure. */
export class AdventureRumourActions {
  archiving = $state(false);
  error = $state<string | null>(null);

  constructor(private readonly deps: RumourDependencies) {}

  archive = async (): Promise<void> => {
    if (this.archiving || this.deps.manager.readOnly) return;
    this.archiving = true;
    this.error = null;
    try {
      await this.deps.manager.end();
      await this.deps.manager.close();
    } catch {
      this.error =
        "The current adventure could not be archived. It has not been replaced.";
    } finally {
      this.archiving = false;
    }
  };

  add = async (): Promise<void> => {
    const pending = this.deps.handoff.forVault(this.deps.getVaultId());
    if (!pending || !this.deps.manager.session || this.deps.manager.readOnly)
      return;
    this.error = null;
    const item: ScenarioItem = {
      ...structuredClone(pending.scenario),
      knowledge: "heard",
      anchorRefs: [],
      revealedSecretIds: [],
      secretBindings: {
        truth: crypto.randomUUID(),
        ifInvestigated: crypto.randomUUID(),
        eventIds: {},
      },
    };
    try {
      await this.deps.manager.addScenario(item);
      this.deps.handoff.clear();
    } catch (cause) {
      this.error = `The rumour was not added. ${describeScenarioMutationError(cause)}`;
    }
  };

  cancel = (): void => {
    const vaultId = this.deps.getVaultId();
    const generatorId =
      this.deps.handoff.forVault(vaultId)?.sourceGeneratorId === "adventure"
        ? "adventure"
        : "rumour";
    // Keep the source batch so the generator reopens on the same draft.
    const hasSourceBatch = this.deps.handoff.cancel(vaultId);
    this.deps.draft.approach = "choose";
    this.deps.draft.title = "";
    this.deps.draft.premise = "";
    if (hasSourceBatch) this.deps.openGenerator(generatorId);
  };
}
