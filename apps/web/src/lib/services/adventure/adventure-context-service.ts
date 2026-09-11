import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SourceRecordReference,
} from "@codex/adventure-engine";

export interface AdventureSourceResolver {
  getById(
    vaultId: string,
    recordId: string,
  ): Promise<{
    id: string;
    title: string;
    type: string;
    text: string;
    lore?: string;
  } | null>;
  search(
    vaultId: string,
    query: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      type: string;
      text: string;
      lore?: string;
    }>
  >;
}

export class AdventureContextService {
  constructor(private resolver: AdventureSourceResolver) {}

  setResolver(resolver: AdventureSourceResolver): void {
    this.resolver = resolver;
  }

  async resolveAnchors(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    const excerpts: ResolvedSourceExcerpt[] = [];
    for (const reference of session.sourceRecords) {
      const record = await this.resolver.getById(
        session.vaultId,
        reference.recordId,
      );
      if (!record) continue;
      excerpts.push({
        recordId: record.id,
        displayName: record.title,
        content: record.text.slice(0, 8_000),
        lore: record.lore,
        role: reference.role,
      });
    }
    return excerpts;
  }

  async resolveActionRelevant(
    session: AdventureSession,
    action: string,
  ): Promise<ResolvedSourceExcerpt[]> {
    const records = await this.resolver.search(session.vaultId, action, 8);
    const anchored = new Set(
      session.sourceRecords.map((reference) => reference.recordId),
    );
    return records
      .filter((record) => !anchored.has(record.id))
      .map((record) => ({
        recordId: record.id,
        displayName: record.title,
        content: record.text.slice(0, 4_000),
        lore: record.lore,
        role: "turn-source" as SourceRecordReference["role"],
      }));
  }

  async resolveOpeningRelevant(
    session: AdventureSession,
  ): Promise<ResolvedSourceExcerpt[]> {
    const playerCharacter = session.playerCharacter;
    const characterContext =
      playerCharacter.kind === "canonical"
        ? playerCharacter.name
        : `${playerCharacter.name} ${playerCharacter.description}`;
    const query = [session.title, session.premise, characterContext]
      .filter(Boolean)
      .join(" ");
    const records = await this.resolver.search(session.vaultId, query, 8);
    const anchored = new Set(
      session.sourceRecords.map((reference) => reference.recordId),
    );
    return records
      .filter((record) => !anchored.has(record.id))
      .map((record) => ({
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
