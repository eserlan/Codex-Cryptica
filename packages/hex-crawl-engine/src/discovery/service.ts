import { DiceEngine } from "dice-engine";
import { RandomSourceEngine } from "random-source-engine";
import type { HexContext } from "../context";
import type { Terrain } from "../terrain";
import { GENERAL_TABLES } from "../tables/general-tables";
import { TERRAIN_TABLES } from "../tables/terrain-tables";
import { buildTableSource, type TableDiscoveryPart } from "../tables/types";
import {
  DISCOVERY_PART_IDS,
  type DiscoveryPartId,
  type DraftPart,
  type HexDiscoveryDraft,
} from "./draft";
import {
  buildDiscoverySystemPrompt,
  buildDiscoveryUserPrompt,
  buildRegenerationSystemPrompt,
  buildRegenerationUserPrompt,
} from "./prompts";
import {
  partFromStocking,
  replacePart,
  tableFactionPart,
  textFromTableEntry,
} from "./parts";
import { z } from "zod";
import {
  HexStockingSchema,
  StockingPartSchemas,
  type HexStocking,
} from "./schema";

/** The model call. The caller parses the JSON; the engine validates it. */
export type ModelRunner = (
  system: string,
  user: string,
  signal?: AbortSignal,
) => Promise<unknown>;

export interface Clock {
  now(): number;
}

export interface HexDiscoveryServiceDeps {
  /** Injected randomness in [0, 1). Table rolls are repeatable for a fixed seed. */
  rng: () => number;
  clock: Clock;
}

export interface GenerateInput {
  context: HexContext;
  terrain?: Terrain;
  aiDisabled: boolean;
  modelRunner?: ModelRunner;
  signal?: AbortSignal;
}

export interface RegenerateInput extends GenerateInput {
  part: DiscoveryPartId;
  draft: HexDiscoveryDraft;
}

/**
 * `draft` is absent only when `failure` is set. A failed generation has no
 * previous draft to return, so nothing is offered for saving (FR-034).
 */
export interface DiscoveryResult {
  draft?: HexDiscoveryDraft;
  fellBackToTables: boolean;
  failure?: "ai-failed";
}

const FAILED = Symbol("ai-failed");

function abortError(): Error {
  const error = new Error("The discovery was cancelled.");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortError();
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Wraps an rng as the crypto provider DiceEngine expects, so rolls stay injectable. */
function cryptoFrom(rng: () => number) {
  return {
    getRandomValues(buffer: Uint32Array): Uint32Array {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(rng() * 4294967296);
      }
      return buffer;
    },
  };
}

/** Whether a hex's offline tables are the general set (custom or no terrain). */
function usesGeneralTables(terrain: Terrain | undefined): boolean {
  return terrain?.kind !== "preset";
}

const wrapperFor = (id: DiscoveryPartId) =>
  z.object({ [id]: StockingPartSchemas[id] });

export class HexDiscoveryService {
  private readonly engine: RandomSourceEngine;

  constructor(private readonly deps: HexDiscoveryServiceDeps) {
    this.engine = new RandomSourceEngine(
      new DiceEngine(cryptoFrom(deps.rng), deps.clock),
    );
  }

  async generate(input: GenerateInput): Promise<DiscoveryResult> {
    throwIfAborted(input.signal);
    if (input.aiDisabled || !input.modelRunner) {
      return {
        draft: this.rollFromTables(input.terrain, factionNames(input.context)),
        fellBackToTables: true,
      };
    }

    const raw = await this.askModel(
      input.modelRunner,
      buildDiscoverySystemPrompt(),
      buildDiscoveryUserPrompt(input.context),
      input.signal,
    );
    const parsed =
      raw === FAILED ? undefined : HexStockingSchema.safeParse(raw);
    if (!parsed?.success)
      return { fellBackToTables: false, failure: "ai-failed" };

    return {
      draft: this.draftFromStocking(parsed.data),
      fellBackToTables: false,
    };
  }

  async regeneratePart(input: RegenerateInput): Promise<DiscoveryResult> {
    throwIfAborted(input.signal);
    const { part, draft } = input;

    if (input.aiDisabled || !input.modelRunner) {
      const fresh = this.rollPart(
        part,
        input.terrain,
        factionNames(input.context),
      );
      return { draft: replacePart(draft, part, fresh), fellBackToTables: true };
    }

    const raw = await this.askModel(
      input.modelRunner,
      buildRegenerationSystemPrompt(part),
      buildRegenerationUserPrompt(part, draft, input.context),
      input.signal,
    );
    const parsed = raw === FAILED ? undefined : wrapperFor(part).safeParse(raw);
    if (!parsed?.success) {
      return { draft, fellBackToTables: false, failure: "ai-failed" };
    }

    const value = (parsed.data as Record<string, unknown>)[
      part
    ] as HexStocking[typeof part];
    return {
      draft: replacePart(draft, part, partFromStocking(part, value, "ai")),
      fellBackToTables: false,
    };
  }

  /** A full six-part draft from the offline tables. Never calls a model. */
  rollFromTables(
    terrain: Terrain | undefined,
    factions: readonly string[],
  ): HexDiscoveryDraft {
    const general = usesGeneralTables(terrain);
    const parts = {} as Record<DiscoveryPartId, DraftPart>;
    for (const id of DISCOVERY_PART_IDS) {
      parts[id] = this.rollPart(id, terrain, factions);
    }
    return {
      source: "tables",
      createdAt: this.deps.clock.now(),
      ...(general ? { usedGeneralTables: true } : {}),
      parts,
    };
  }

  private rollPart(
    id: DiscoveryPartId,
    terrain: Terrain | undefined,
    factions: readonly string[],
  ): DraftPart {
    if (id === "factionPresence") return tableFactionPart(factions[0]);
    const tableSet =
      terrain?.kind === "preset" ? TERRAIN_TABLES[terrain.id] : GENERAL_TABLES;
    const part = id as TableDiscoveryPart;
    const source = buildTableSource(`hex-crawl:${part}`, tableSet[part]);
    const outcome = this.engine.roll(source, { lookup: () => undefined });
    return {
      text: textFromTableEntry(part, outcome.finalText.trim()),
      source: "tables",
      status: "pending",
    };
  }

  private draftFromStocking(stocking: HexStocking): HexDiscoveryDraft {
    const parts = {} as Record<DiscoveryPartId, DraftPart>;
    for (const id of DISCOVERY_PART_IDS) {
      parts[id] = partFromStocking(id, stocking[id], "ai");
    }
    return { source: "ai", createdAt: this.deps.clock.now(), parts };
  }

  private async askModel(
    runner: ModelRunner,
    system: string,
    user: string,
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    try {
      return await runner(system, user, signal);
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) throw abortError();
      return FAILED;
    }
  }
}

function factionNames(context: HexContext): string[] {
  return context.nearestFactions.map((f) => f.title);
}
