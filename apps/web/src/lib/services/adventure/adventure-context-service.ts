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
import {
  requiredGroundingSources,
  selectGroundingCandidates,
  MAX_GROUNDING_RECORDS,
} from "@codex/adventure-engine";
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
  connections?: Entity["connections"];
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
    connections: loaded.connections ?? entity.connections,
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
    requiredGroundingSources(session).map((reference) => reference.recordId),
  );
  return records.filter((record) => !anchored.has(record.id));
}

export class AdventureContextService {
  constructor(private resolver: AdventureSourceResolver) {}

  setResolver(resolver: AdventureSourceResolver): void {
    this.resolver = resolver;
  }

  private remainingRecords(session: AdventureSession): number {
    return Math.max(
      0,
      MAX_GROUNDING_RECORDS - requiredGroundingSources(session).length,
    );
  }

  /** Recheck explicitly selected records after asynchronous retrieval. */
  async verifyRequiredSources(session: AdventureSession): Promise<void> {
    for (const reference of requiredGroundingSources(session)) {
      if (!(await this.resolver.getById(session.vaultId, reference.recordId))) {
        throw new Error("required-source-unavailable");
      }
    }
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
    const resolved = resolveTemporalWorldContext({
      ...input,
      ...source,
      entities,
    });
    // Reclassification may discover new candidates after metadata changes.
    // Leave those for a later interaction rather than hydrating beyond this selection.
    const selected = (record: { id: string }) => overrides.has(record.id);
    return {
      ...resolved,
      playerSafe: resolved.playerSafe.filter(selected),
      gmOnly: resolved.gmOnly.filter(selected),
      unresolved: resolved.unresolved.filter(selected),
      omitted:
        resolved.omitted +
        resolved.gmOnly.filter((record) => !selected(record)).length,
    };
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
    if (!at) return null;
    if (!this.resolver.getWorldSnapshot)
      throw new Error("temporal-world-not-configured");
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
    if (record.visibility === "hidden") {
      return {
        content:
          "[GM-only source: existence and identity are not player knowledge]" +
          (applicability
            ? " [Period applicability: " + applicability + "]"
            : ""),
        lore: [
          applicability
            ? "Period applicability: " +
              applicability +
              "; never project future or uncertain facts into established current knowledge."
            : "",
          record.title,
          record.text,
          record.lore,
        ]
          .filter(Boolean)
          .join("\n")
          .slice(0, maxChars),
      };
    }
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
    const references = requiredGroundingSources(session);
    selectGroundingCandidates(
      references.map((reference) => reference.recordId),
      [],
    );
    for (const reference of references) {
      const record = await this.resolver.getById(
        session.vaultId,
        reference.recordId,
      );
      if (!record) throw new Error("required-source-unavailable");
      const { content, lore } = this.excerpt(
        record,
        policy,
        Math.max(8_000, record.text.length, record.lore?.length ?? 0),
      );
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
    if (this.remainingRecords(session) === 0) return [];
    const { records, policy } = await this.searchSources(session, [
      action,
      session.visibleState.location?.text,
      ...scenarioSearchTerms(session),
    ]);
    const searched = withoutAnchored(session, records)
      .slice(0, this.remainingRecords(session))
      .map((record) => {
        const { content, lore } = this.excerpt(record, policy, 4_000);
        return {
          recordId: record.id,
          displayName: record.title,
          content,
          lore,
          role: "turn-source" as SourceRecordReference["role"],
        };
      });
    const neighbors =
      session.worldEntry && this.remainingRecords(session) > records.length
        ? await this.resolveWorldEntryOpening(
            session,
            Math.min(14, this.remainingRecords(session) - records.length),
          )
        : [];
    const scenarioAnchors = await this.resolveScenarioAnchorReferences(
      session,
      searched.length + neighbors.length,
    );
    return [
      ...new Map(
        [...searched, ...neighbors, ...scenarioAnchors].map((source) => [
          source.recordId,
          source,
        ]),
      ).values(),
    ];
  }

  private async resolveWorldEntryOpening(
    session: AdventureSession,
    maxRecords = Math.min(14, this.remainingRecords(session)),
  ): Promise<ResolvedSourceExcerpt[]> {
    const entry = session.worldEntry;
    if (
      !entry ||
      !this.resolver.getWorldSnapshot ||
      this.remainingRecords(session) === 0
    )
      return [];
    const candidateRecords = await this.openingCandidates(session, maxRecords);
    const eligible = withoutAnchored(session, candidateRecords).slice(
      0,
      this.remainingRecords(session),
    );
    const relevant = await Promise.all(
      eligible.map(async (record) => {
        const source = await this.resolver.getById(session.vaultId, record.id);
        if (!source) return null;
        // Undated prose stays GM-only lore; only dated events are content.
        const { content, lore } = this.excerpt(
          source,
          { classify: () => record.applicability },
          1_500,
        );
        return {
          recordId: record.id,
          displayName: record.title,
          content: content.slice(0, 1_500),
          // GM-only lore never appears in the UI or player projections.
          ...relationshipLore(lore, source.connections),
          role: "turn-source" as const,
        };
      }),
    );
    return relevant.filter(
      (value): value is NonNullable<typeof value> => value !== null,
    );
  }

  private async openingCandidates(
    session: AdventureSession,
    maxRecords: number,
  ) {
    const entry = session.worldEntry!;
    const snapshot = await this.resolver.getWorldSnapshot!(session.vaultId);
    const characterId =
      session.playerCharacter.kind === "canonical"
        ? session.playerCharacter.recordId
        : undefined;
    const locationId =
      session.visibleState?.location?.sourceRecordId ??
      (entry.location.kind === "canonical"
        ? entry.location.recordId
        : undefined);
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
              maxRecords,
            })
          ).gmOnly
        : resolveWorldEntryPreview({
            entities: snapshot.entities,
            calendar: snapshot.calendar,
            characterId,
            locationId,
            at: entry.at,
            maxRecords,
          }).records;
    return candidateRecords;
  }

  private async searchSources(
    session: AdventureSession,
    terms: Array<string | undefined>,
  ) {
    const records = await this.resolver.search(
      session.vaultId,
      terms.filter(Boolean).join(" "),
      Math.min(8, this.remainingRecords(session)),
    );
    const policy = await this.periodPolicy(session);
    return { records, policy };
  }

  async resolveOpeningRelevant(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    if (session.worldEntry) {
      const world = await this.resolveWorldEntryOpening(session);
      const anchors = await this.resolveScenarioAnchorReferences(
        session,
        world.length,
      );
      return [
        ...new Map(
          [...world, ...anchors].map((source) => [source.recordId, source]),
        ).values(),
      ];
    }
    if (this.remainingRecords(session) === 0) return [];
    const playerCharacter = session.playerCharacter;
    const characterContext =
      playerCharacter.kind === "canonical"
        ? playerCharacter.name
        : `${playerCharacter.name} ${playerCharacter.description}`;
    const { records, policy } = await this.searchSources(session, [
      session.title,
      session.premise,
      characterContext,
      ...scenarioSearchTerms(session),
    ]);
    const relevant = withoutAnchored(session, records)
      .slice(0, this.remainingRecords(session))
      .map((record) => ({
        recordId: record.id,
        displayName: record.title,
        ...this.excerpt(record, policy, 4_000),
        role: "turn-source" as const,
      }));
    const scenarioAnchors = await this.resolveScenarioAnchorReferences(
      session,
      relevant.length,
    );
    return [
      ...new Map(
        [...relevant, ...scenarioAnchors].map((source) => [
          source.recordId,
          source,
        ]),
      ).values(),
    ];
  }

  private async resolveScenarioAnchorReferences(
    session: AdventureSession,
    alreadySelected: number,
  ): Promise<ResolvedSourceExcerpt[]> {
    const limit = Math.max(0, this.remainingRecords(session) - alreadySelected);
    if (!limit) return [];
    const seen = new Set<string>();
    const ids = (session.scenarioCollection?.items ?? [])
      .flatMap((item) => item.anchorRefs)
      .filter((id) => !seen.has(id) && Boolean(seen.add(id)))
      .slice(0, limit);
    const policy = await this.periodPolicy(session);
    const resolved = await Promise.all(
      ids.map(async (id) => {
        const record = await this.resolver.getById(session.vaultId, id);
        if (!record) return null;
        const { content, lore } = this.excerpt(record, policy, 4_000);
        return {
          recordId: record.id,
          displayName: record.title,
          content,
          lore,
          role: "anchor" as const,
        };
      }),
    );
    return resolved.filter(
      (source): source is NonNullable<typeof source> => source !== null,
    );
  }
}

function scenarioSearchTerms(session: AdventureSession): string[] {
  return (session.scenarioCollection?.items ?? []).flatMap((item) => [
    item.playerVisible.rumour,
    item.playerVisible.lead,
    item.gmOnly.truth,
    ...(item.gmOnly.ifInvestigated ? [item.gmOnly.ifInvestigated] : []),
  ]);
}

export const adventureContextService = new AdventureContextService({
  async getById() {
    return null;
  },
  async search() {
    return [];
  },
});

/** Relationships are references, not proof of period or character knowledge. */
function relationshipLore(
  lore: string | undefined,
  connections: Entity["connections"] | undefined,
): { lore?: string } {
  const relations = connections?.length
    ? "GM-only undated relationship references; do not assume these hold at the chosen date or are character knowledge: " +
      JSON.stringify(connections.slice(0, 12))
    : "";
  const text = [lore, relations].filter(Boolean).join("\n").slice(0, 3_000);
  return text ? { lore: text } : {};
}
