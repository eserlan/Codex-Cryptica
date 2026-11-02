import type { Entity } from "schema";
import type {
  WorldCalendar,
  TemporalMetadata,
  DateSelection,
} from "chronology-engine";
import {
  classifyEntityAt,
  periodExcerpt,
  resolveTemporalWorldContext,
  type TemporalWorldContext,
} from "./temporal-world-context";
import { resolveWorldEntryPreview } from "./world-entry-context-preview";
import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SourceRecordReference,
} from "@codex/adventure-engine";

/** Authoritative record data as loaded from the Vault. */
export interface AdventureSourceRecord {
  id: string;
  title: string;
  type: string;
  text: string;
  lore?: string;
  /**
   * Metadata restored with the body. Date-aware projections decide on these,
   * so the loaded values override the (possibly stale) graph index.
   */
  visibility?: Entity["visibility"];
  start_date?: Entity["start_date"];
  end_date?: Entity["end_date"];
  date?: Entity["date"];
}

export interface AdventureSourceResolver {
  /** Optional world snapshot adapter for date-aware exploration starts. */
  getWorldSnapshot?(vaultId: string): Promise<{
    entities: Entity[];
    calendar: WorldCalendar;
  }>;
  getById(
    vaultId: string,
    recordId: string,
  ): Promise<AdventureSourceRecord | null>;
  search(
    vaultId: string,
    query: string,
    limit: number,
  ): Promise<AdventureSourceRecord[]>;
}

const METADATA_KEYS = ["visibility", "start_date", "end_date", "date"] as const;

/** Apply loaded body and metadata onto the indexed entity. */
function hydrateEntity(entity: Entity, loaded: AdventureSourceRecord): Entity {
  const hydrated: Entity = {
    ...entity,
    content: loaded.text,
    lore: loaded.lore,
  };
  for (const key of METADATA_KEYS) {
    if (key in loaded) {
      (hydrated as Record<string, unknown>)[key] = loaded[key];
    }
  }
  return hydrated;
}

/** Date context for a dated World Entry session, or null for other sessions. */
interface PeriodPolicy {
  classify(record: AdventureSourceRecord): ReturnType<typeof classifyEntityAt>;
}

/** Drops records the session already carries as anchored sources. */
function withoutAnchored<T extends { id: string }>(
  session: AdventureSession,
  records: T[],
): T[] {
  const anchored = new Set(
    session.sourceRecords.map((reference) => reference.recordId),
  );
  return records.filter((record) => !anchored.has(record.id));
}

export class AdventureContextService {
  constructor(private resolver: AdventureSourceResolver) {}

  setResolver(resolver: AdventureSourceResolver): void {
    this.resolver = resolver;
  }

  /** Date-aware, bounded source retrieval; never writes or rewrites Vault canon. */
  async resolveTemporalWorld(input: {
    vaultId: string;
    characterId?: string;
    locationId?: string;
    at: TemporalMetadata | DateSelection;
    maxRecords?: number;
  }): Promise<TemporalWorldContext> {
    if (!this.resolver.getWorldSnapshot) {
      throw new Error("temporal-world-not-configured");
    }
    const source = await this.resolver.getWorldSnapshot(input.vaultId);
    // The Vault graph index may contain metadata-only records. Select the
    // small relevant subset *before* loading bodies from OPFS.
    const initial = resolveTemporalWorldContext({ ...input, ...source });
    const byId = new Map(source.entities.map((entity) => [entity.id, entity]));
    // Only the bounded selection creates asynchronous OPFS reads. Mapping
    // every Vault record into a Promise would scale memory with Vault size.
    const hydrated = await Promise.all(
      initial.gmOnly.map(async (record) => {
        const entity = byId.get(record.id)!;
        const loaded = await this.resolver.getById(input.vaultId, entity.id);
        return [
          record.id,
          loaded ? hydrateEntity(entity, loaded) : entity,
        ] as const;
      }),
    );
    const overrides = new Map(hydrated);
    const entities = source.entities.map(
      (entity) => overrides.get(entity.id) ?? entity,
    );
    // Recompute with the restored metadata: a record restored as hidden, or
    // with a new end date, must not keep its index classification.
    return resolveTemporalWorldContext({ ...input, ...source, entities });
  }

  /**
   * The same date policy the opening uses, applied to anchors and later
   * retrieval. Uses the session's World Entry date; returns null when the
   * session is undated or no world snapshot is available.
   */
  private async periodPolicy(
    session: AdventureSession,
  ): Promise<PeriodPolicy | null> {
    const at = session.worldEntry?.at;
    if (!at || !this.resolver.getWorldSnapshot) return null;
    const snapshot = await this.resolver.getWorldSnapshot(session.vaultId);
    const byId = new Map(
      snapshot.entities.map((entity) => [entity.id, entity]),
    );
    return {
      classify(record) {
        const indexed = byId.get(record.id);
        const entity = indexed
          ? hydrateEntity(indexed, record)
          : ({
              id: record.id,
              title: record.title,
              type: record.type,
              content: record.text,
              connections: [],
              ...Object.fromEntries(
                METADATA_KEYS.filter((key) => key in record).map((key) => [
                  key,
                  record[key],
                ]),
              ),
            } as unknown as Entity);
        return classifyEntityAt(entity, at, snapshot.calendar);
      },
    };
  }

  private excerpt(
    record: AdventureSourceRecord,
    policy: PeriodPolicy | null,
    maxChars: number,
  ): { content: string; lore?: string } {
    const applicability = policy?.classify(record);
    if (!applicability) {
      return {
        content: record.text.slice(0, maxChars),
        ...(record.lore ? { lore: record.lore } : {}),
      };
    }
    const projected = periodExcerpt({
      title: record.title,
      type: record.type,
      text: record.text.slice(0, maxChars),
      lore: record.lore,
      applicability,
    });
    return {
      content: projected.content.slice(0, maxChars),
      ...(projected.lore ? { lore: projected.lore.slice(0, maxChars) } : {}),
    };
  }

  async resolveAnchors(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    const policy = await this.periodPolicy(session);
    const excerpts: ResolvedSourceExcerpt[] = [];
    for (const reference of session.sourceRecords) {
      const record = await this.resolver.getById(
        session.vaultId,
        reference.recordId,
      );
      if (!record) continue;
      const { content, lore } = this.excerpt(record, policy, 8_000);
      excerpts.push({
        recordId: record.id,
        displayName: record.title,
        content,
        lore,
        role: reference.role,
      });
    }
    return excerpts;
  }

  async resolveActionRelevant(
    session: AdventureSession,
    action: string,
  ): Promise<ResolvedSourceExcerpt[]> {
    const query = [action, session.visibleState.location?.text]
      .filter(Boolean)
      .join(" ");
    const records = await this.resolver.search(session.vaultId, query, 8);
    const policy = await this.periodPolicy(session);
    return withoutAnchored(session, records).map((record) => {
      const { content, lore } = this.excerpt(record, policy, 4_000);
      return {
        recordId: record.id,
        displayName: record.title,
        content,
        lore,
        role: "turn-source" as SourceRecordReference["role"],
      };
    });
  }

  private async resolveWorldEntryOpening(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    const entry = session.worldEntry;
    if (!entry || !this.resolver.getWorldSnapshot) return [];
    const snapshot = await this.resolver.getWorldSnapshot(session.vaultId);
    const characterId =
      session.playerCharacter.kind === "canonical"
        ? session.playerCharacter.recordId
        : undefined;
    const locationId =
      entry.location.kind === "canonical" ? entry.location.recordId : undefined;
    // Date-aware context is hydrated only for a bounded selection. With a
    // date and at least one canonical root, classify by date; only a fully
    // provisional or undated start uses the conservative undated fallback.
    const candidateRecords =
      entry.at && (characterId || locationId)
        ? (
            await this.resolveTemporalWorld({
              vaultId: session.vaultId,
              characterId,
              locationId,
              at: entry.at,
              maxRecords: 14,
            })
          ).playerSafe.filter((record) => record.applicability !== "future")
        : resolveWorldEntryPreview({
            entities: snapshot.entities,
            calendar: snapshot.calendar,
            characterId,
            locationId,
            at: entry.at,
            maxRecords: 14,
          }).records;
    const eligible = withoutAnchored(session, candidateRecords);
    const relevant = await Promise.all(
      eligible.map(async (record) => {
        const source = await this.resolver.getById(session.vaultId, record.id);
        if (!source || source.visibility === "hidden") return null;
        // Undated prose stays GM-only lore; only dated events are content.
        const { content, lore } = periodExcerpt({
          title: record.title,
          type: record.type,
          text: source.text,
          lore: source.lore,
          applicability: record.applicability,
        });
        return {
          recordId: record.id,
          displayName: record.title,
          content: content.slice(0, 1_500),
          // GM-only lore never appears in the UI or player projections.
          ...(lore ? { lore: lore.slice(0, 1_500) } : {}),
          role: "turn-source" as const,
        };
      }),
    );
    return relevant.filter(
      (value): value is NonNullable<typeof value> => value !== null,
    );
  }

  async resolveOpeningRelevant(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    if (session.worldEntry) return this.resolveWorldEntryOpening(session);
    const playerCharacter = session.playerCharacter;
    const characterContext =
      playerCharacter.kind === "canonical"
        ? playerCharacter.name
        : `${playerCharacter.name} ${playerCharacter.description}`;
    const query = [session.title, session.premise, characterContext]
      .filter(Boolean)
      .join(" ");
    const records = await this.resolver.search(session.vaultId, query, 8);
    return withoutAnchored(session, records).map((record) => ({
      recordId: record.id,
      displayName: record.title,
      content: record.text.slice(0, 4_000),
      lore: record.lore,
      role: "turn-source" as SourceRecordReference["role"],
    }));
  }
}

export const adventureContextService = new AdventureContextService({
  async getById() {
    return null;
  },
  async search() {
    return [];
  },
});
