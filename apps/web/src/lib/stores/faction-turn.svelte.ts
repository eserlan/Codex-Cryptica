import {
  FactionTurnEngine,
  factionTurnEngine as defaultEngine,
  evaluateEligibility,
  toWorldDateStamp,
  sortHistory,
  mostRecentActive,
  type CommitPlan,
  type EligibilityResult,
  type FactionTurnProposal,
  type FactionTurnRecord,
  type FactionStatRole,
  type ResolvedWorldDate,
} from "@codex/faction-engine";
import {
  factionTurnGenerationService as defaultAiService,
  type FactionTurnGenerationService,
} from "@codex/ai-engine";
import {
  DEFAULT_FACTION_TURN_SETTINGS,
  FactionTurnSettingsSchema,
  type Entity,
  type FactionTurnSettings,
} from "schema";
import { vault as defaultVault } from "./vault.svelte";
import type { LocalEntity } from "./vault/types";
import { calendarStore as defaultCalendarStore } from "./calendar.svelte";
import { getDB } from "../utils/idb";
import { buildParticipantLore } from "./faction-turn-ai-context";
import { builtInFactionTurnRoleMappings } from "./faction-turn-stat-roles";

/**
 * Faction Turn store.
 *
 * Orchestrates the pure engine against the vault. Three responsibilities the
 * engine deliberately does not have: reading the world clock, persisting vault
 * settings, and **applying a commit plan atomically**.
 */

export interface FactionTurnDeps {
  vault?: typeof defaultVault;
  calendarStore?: typeof defaultCalendarStore;
  engine?: FactionTurnEngine;
  aiService?: FactionTurnGenerationService;
}

export type CommitOutcome =
  | { ok: true; record: FactionTurnRecord }
  | {
      ok: false;
      kind: "stale" | "target-missing" | "not-most-recent" | "failed";
      message: string;
    };

const SETTINGS_KEY = (vaultId: string) => `factionTurn_${vaultId}`;

export class FactionTurnStore {
  settings = $state<FactionTurnSettings>({ ...DEFAULT_FACTION_TURN_SETTINGS });

  /**
   * The uncommitted preview.
   *
   * Transient by contract (FR-022a): held only in memory, never persisted,
   * never synced, never restored. A reload legitimately loses it.
   */
  proposal = $state<FactionTurnProposal | null>(null);

  isResolving = $state(false);
  isCommitting = $state(false);
  lastError = $state<string | null>(null);

  private deps: Required<FactionTurnDeps>;

  constructor(deps: FactionTurnDeps = {}) {
    this.deps = {
      vault: deps.vault ?? defaultVault,
      calendarStore: deps.calendarStore ?? defaultCalendarStore,
      engine: deps.engine ?? defaultEngine,
      aiService: deps.aiService ?? defaultAiService,
    };
  }

  // --- settings ----------------------------------------------------------

  async loadSettings(): Promise<void> {
    try {
      const vaultId = this.deps.vault.activeVaultId;
      if (!vaultId) return;
      const db = await getDB();
      const saved = await db.get("settings", SETTINGS_KEY(vaultId));
      this.settings = saved
        ? FactionTurnSettingsSchema.parse(saved)
        : { ...DEFAULT_FACTION_TURN_SETTINGS };
    } catch {
      // Settings are a convenience, not correctness. Falling back to defaults
      // keeps the feature usable rather than failing the whole tab.
      this.settings = { ...DEFAULT_FACTION_TURN_SETTINGS };
    }
  }

  async saveSettings(next: Partial<FactionTurnSettings>): Promise<void> {
    this.settings = FactionTurnSettingsSchema.parse({
      ...this.settings,
      ...next,
    });
    const vaultId = this.deps.vault.activeVaultId;
    if (!vaultId) return;
    const db = await getDB();
    await db.put(
      "settings",
      $state.snapshot(this.settings),
      SETTINGS_KEY(vaultId),
    );
  }

  // --- opt-in ------------------------------------------------------------

  isEnabled(faction: Entity | undefined): boolean {
    return faction?.factionTurn?.enabled === true;
  }

  async setEnabled(faction: Entity, enabled: boolean): Promise<void> {
    // Opting out preserves history (FR-001) — the GM may re-enable later, and
    // silently discarding a campaign's worth of turns would be unforgivable.
    await this.deps.vault.updateEntity(faction.id, {
      factionTurn: {
        enabled,
        statRoles: {
          ...(faction.factionTurn?.statRoles ?? {}),
          ...(enabled ? builtInFactionTurnRoleMappings(faction) : {}),
        },
        lastTurnDate: faction.factionTurn?.lastTurnDate,
        history: faction.factionTurn?.history ?? [],
      },
    });
  }

  async setRole(
    faction: Entity,
    role: FactionStatRole,
    fieldId: string | undefined,
  ): Promise<void> {
    const current = faction.factionTurn;
    await this.deps.vault.updateEntity(faction.id, {
      factionTurn: {
        enabled: current?.enabled ?? true,
        statRoles: { ...(current?.statRoles ?? {}), [role]: fieldId },
        lastTurnDate: current?.lastTurnDate,
        history: current?.history ?? [],
      },
    });
  }

  // --- world clock (read only, never written — FR-006) --------------------

  private resolvedWorldDate(): ResolvedWorldDate | null {
    const resolved = this.deps.calendarStore.calendarCurrentDate;
    if (!resolved) return null;
    return {
      source: resolved.source,
      date: resolved.date,
      entityId: resolved.entityId,
    };
  }

  private calendarShape() {
    return {
      monthsPerYear: this.deps.calendarStore.config.months?.length || 12,
      revision: this.deps.calendarStore.config.revision || 1,
    };
  }

  eligibility(faction: Entity | undefined): EligibilityResult {
    return evaluateEligibility(
      faction?.factionTurn,
      this.resolvedWorldDate(),
      this.settings,
      this.calendarShape(),
    );
  }

  history(faction: Entity | undefined): FactionTurnRecord[] {
    const records = faction?.factionTurn?.history ?? [];
    const { revision, monthsPerYear } = this.calendarShape();
    return sortHistory(records, revision, monthsPerYear);
  }

  // --- propose -----------------------------------------------------------

  private turnEnabledFactions(): Entity[] {
    return this.deps.vault.allEntities.filter(
      (e) => e.factionTurn?.enabled === true,
    );
  }

  /**
   * Resolve a turn and hold the result for review. Writes nothing (FR-022).
   */
  async propose(
    faction: Entity,
    target: Entity,
    options: { isOverride?: boolean } = {},
  ): Promise<FactionTurnProposal | null> {
    if (this.isResolving) return null;
    this.isResolving = true;
    this.lastError = null;

    try {
      const resolved = this.resolvedWorldDate();
      if (!resolved || resolved.source === "realWorld") {
        // FR-008a — a real-world date is not campaign time.
        this.lastError =
          "Set a current date for this campaign before running faction turns.";
        return null;
      }
      const worldDate = toWorldDateStamp(
        resolved,
        this.calendarShape().revision,
      );

      // Resolve mechanically first, so the AI call has a band and a range to
      // work within — and so a turn exists even if that call never returns.
      const mechanical = this.deps.engine.propose({
        faction,
        target,
        allFactions: this.turnEnabledFactions(),
        settings: $state.snapshot(this.settings),
        worldDate,
      });

      if (!mechanical.ok) {
        this.lastError = mechanical.errors.message;
        return null;
      }

      const ai = await this.deps.aiService.generate({
        factionTitle: faction.title,
        factionSummary: (faction.content ?? "").slice(0, 400),
        targetTitle: target.title,
        targetSummary: (target.content ?? "").slice(0, 400),
        participantLore: this.settings.includeParticipantLore
          ? {
              faction: buildParticipantLore(
                faction,
                this.deps.vault.allEntities,
              ),
              target: buildParticipantLore(target, this.deps.vault.allEntities),
            }
          : undefined,
        resolution: {
          actingLabel: mechanical.value.resolution.actingLabel,
          actingValue: mechanical.value.resolution.actingValue,
          opposingValue: mechanical.value.resolution.opposingValue,
          oppositionDetail: mechanical.value.resolution.oppositionDetail,
          rollTotal: mechanical.value.resolution.roll?.total ?? null,
          total: mechanical.value.resolution.total,
          mechanicalBand: mechanical.value.resolution.mechanicalBand,
          permittedBands: mechanical.value.resolution.permittedBands,
        },
        existingHold: [],
        wantBandSelection: this.settings.aiBandSelection,
        wantNarration: this.settings.aiNarration,
      });

      // Re-propose with the AI's contribution. The engine re-applies the band
      // through applyAiBand, which is where the permitted range is enforced —
      // this store never decides whether a band is acceptable.
      const withAi = this.deps.engine.propose(
        {
          faction,
          target,
          allFactions: this.turnEnabledFactions(),
          settings: $state.snapshot(this.settings),
          worldDate,
        },
        {
          ai:
            ai.band && ai.reason ? { band: ai.band, reason: ai.reason } : null,
          aiNarrative: ai.narrative,
          isOverride: options.isOverride ?? false,
        },
      );

      if (!withAi.ok) {
        this.lastError = withAi.errors.message;
        return null;
      }

      this.proposal = withAi.value;
      return withAi.value;
    } finally {
      this.isResolving = false;
    }
  }

  /** Throw the preview away. Nothing was written, so nothing to undo (FR-024). */
  discard(): void {
    this.proposal = null;
    this.lastError = null;
  }

  // --- commit ------------------------------------------------------------

  /**
   * Apply a reviewed proposal.
   *
   * A commit writes to three places — the faction's stats, the connection, and
   * the history entry — and `EntityMutationService` offers no transaction across
   * them. So this method takes responsibility for atomicity itself (FR-025a):
   * it captures the prior state, applies in a fixed order, and on any failure
   * replays the inverse for the steps that already succeeded.
   *
   * **History is written last on purpose.** A failure after the history entry
   * would leave a record describing changes that did not happen, which is a
   * worse lie than no record at all. And a partial commit without a history
   * entry is unrecoverable: the GM would have changed numbers, nothing to undo
   * them with, and the inverse patch dying with the discarded proposal.
   */
  async commit(
    proposal: FactionTurnProposal,
    optIntoTypeChange = false,
  ): Promise<CommitOutcome> {
    if (this.isCommitting) {
      return {
        ok: false,
        kind: "failed",
        message: "A turn is already being applied.",
      };
    }
    this.isCommitting = true;

    try {
      const faction = this.deps.vault.entities[proposal.factionId];
      const target = this.deps.vault.entities[proposal.targetId];
      if (!faction) {
        return {
          ok: false,
          kind: "target-missing",
          message: "This faction no longer exists.",
        };
      }

      const plan = this.deps.engine.commit(proposal, faction, target);
      if (!plan.ok) {
        this.lastError = plan.errors.message;
        return {
          ok: false,
          kind: plan.errors.kind,
          message: plan.errors.message,
        };
      }

      const applied = await this.applyPlanAtomically(faction, plan.value, {
        optIntoTypeChange,
        appendRecord: true,
      });

      if (!applied.ok) return applied;

      this.proposal = null;
      return { ok: true, record: plan.value.record };
    } finally {
      this.isCommitting = false;
    }
  }

  /**
   * Undo the most recent committed turn (FR-028).
   */
  async undo(
    faction: Entity,
    record: FactionTurnRecord,
  ): Promise<CommitOutcome> {
    if (this.isCommitting) {
      return {
        ok: false,
        kind: "failed",
        message: "A turn is already being applied.",
      };
    }
    this.isCommitting = true;

    try {
      const plan = this.deps.engine.reverse(record, faction);
      if (!plan.ok) {
        this.lastError = plan.errors.message;
        return {
          ok: false,
          kind: plan.errors.kind,
          message: plan.errors.message,
        };
      }

      const applied = await this.applyPlanAtomically(faction, plan.value, {
        optIntoTypeChange: false,
        appendRecord: false,
      });

      if (!applied.ok) return applied;
      return { ok: true, record: plan.value.record };
    } finally {
      this.isCommitting = false;
    }
  }

  /**
   * The compensating-rollback apply.
   *
   * Reuses the plan's own inverse rather than inventing a second description of
   * "how to undo this", so the two can never drift apart.
   */
  private async applyPlanAtomically(
    faction: Entity,
    plan: CommitPlan,
    options: { optIntoTypeChange: boolean; appendRecord: boolean },
  ): Promise<CommitOutcome> {
    const priorStatSheet = faction.statSheet
      ? structuredClone($state.snapshot(faction.statSheet))
      : undefined;
    const priorConnections = structuredClone(
      $state.snapshot(faction.connections ?? []),
    );
    const priorFactionTurn = faction.factionTurn
      ? structuredClone($state.snapshot(faction.factionTurn))
      : undefined;

    // Track what actually landed, so the rollback undoes only those steps.
    // Blindly restoring all three would mean a failed *history* write triggers
    // a rollback that also writes history — failing for exactly the same reason
    // and leaving the vault half-applied with no recovery.
    let statsApplied = false;
    let connectionApplied = false;

    const rollback = async () => {
      const restore: Partial<LocalEntity> = {};
      if (statsApplied) restore.statSheet = priorStatSheet;
      if (connectionApplied) restore.connections = priorConnections;
      if (Object.keys(restore).length === 0) return;
      await this.deps.vault.updateEntity(faction.id, restore);
    };

    // Only referenced when a rollback needs it; kept for symmetry with the
    // other two captures and to document that history is never partially
    // written (it is a single last write).
    void priorFactionTurn;

    try {
      // 1. Stats.
      if (plan.statUpdates.length > 0) {
        const fields = (faction.statSheet?.fields ?? []).map((field) => {
          const update = plan.statUpdates.find((u) => u.fieldId === field.id);
          return update ? { ...field, value: update.value } : field;
        });
        await this.deps.vault.updateEntity(faction.id, {
          statSheet: { ...(faction.statSheet ?? {}), fields },
        });
        statsApplied = true;
      }

      // 2. The single directed edge, faction -> target (FR-032c).
      if (plan.connectionRemove) {
        const existing = (faction.connections ?? []).find(
          (c) => c.target === plan.connectionRemove!.targetId,
        );
        if (existing) {
          await this.deps.vault.removeConnection(
            faction.id,
            existing.target,
            existing.type,
          );
          connectionApplied = true;
        }
      } else if (plan.connectionWrite) {
        const write = plan.connectionWrite;
        const existing = (faction.connections ?? []).find(
          (c) => c.target === write.targetId,
        );
        const type = options.optIntoTypeChange
          ? (write.type ?? existing?.type ?? "neutral")
          : (existing?.type ?? write.type ?? "neutral");

        // `addConnection` appends unconditionally rather than upserting, and
        // `updateConnection` cannot carry a strength — so an existing edge is
        // replaced rather than edited. Both operations fire their callbacks, so
        // the inbound map and graph stay correct.
        if (existing) {
          await this.deps.vault.removeConnection(
            faction.id,
            existing.target,
            existing.type,
          );
        }
        await this.deps.vault.addConnection(
          faction.id,
          write.targetId,
          type,
          existing?.label,
          write.strength,
        );
        connectionApplied = true;
      }

      // 3. History, last.
      const currentHistory = faction.factionTurn?.history ?? [];
      const history = options.appendRecord
        ? [...currentHistory, plan.record]
        : currentHistory.map((r) =>
            r.id === plan.record.id ? plan.record : r,
          );

      await this.deps.vault.updateEntity(faction.id, {
        factionTurn: {
          enabled: faction.factionTurn?.enabled ?? true,
          statRoles: faction.factionTurn?.statRoles ?? {},
          lastTurnDate: plan.lastTurnDate,
          history,
        },
      });

      return { ok: true, record: plan.record };
    } catch (error) {
      await rollback().catch(() => {
        // A failed rollback is the genuinely bad case, and there is nothing
        // further this layer can do. Surface it plainly rather than pretending
        // the turn was applied.
      });
      const message =
        error instanceof Error
          ? error.message
          : "The turn could not be applied.";
      this.lastError = message;
      return {
        ok: false,
        kind: "failed",
        message: `The turn was not applied. ${message}`,
      };
    }
  }

  // --- promotion (FR-037, FR-038) ----------------------------------------

  /**
   * Promote a turn into an event entity.
   *
   * Never automatic (FR-037): a faction's routine manoeuvring would otherwise
   * flood the GM's hand-authored timeline.
   */
  async promote(
    faction: Entity,
    record: FactionTurnRecord,
  ): Promise<string | null> {
    if (record.promotedEventId) return null;

    const eventId = await this.deps.vault.createEntity(
      "event",
      `${faction.title} — ${record.targetTitle}`,
      {
        content: record.narrative,
        date: {
          year: record.worldDate.year,
          month: record.worldDate.month,
          day: record.worldDate.day,
        },
        connections: [
          { target: faction.id, type: "related_to", strength: 1 },
          { target: record.targetId, type: "related_to", strength: 1 },
        ],
      },
    );

    const history = (faction.factionTurn?.history ?? []).map((r) =>
      r.id === record.id ? { ...r, promotedEventId: eventId } : r,
    );
    await this.deps.vault.updateEntity(faction.id, {
      factionTurn: {
        enabled: faction.factionTurn?.enabled ?? true,
        statRoles: faction.factionTurn?.statRoles ?? {},
        lastTurnDate: faction.factionTurn?.lastTurnDate,
        history,
      },
    });

    return eventId;
  }

  /** The record an undo would target, if any. */
  undoableRecord(faction: Entity | undefined): FactionTurnRecord | undefined {
    return mostRecentActive(faction?.factionTurn?.history ?? []);
  }
}

export const factionTurn = new FactionTurnStore();
