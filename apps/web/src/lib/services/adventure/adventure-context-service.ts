import type {
  AdventureSession,
  ResolvedSourceExcerpt,
  SourceRecordReference,
} from "@codex/adventure-engine";

export interface AdventureSourceResolver {
  getById(
    vaultId: string,
    recordId: string,
  ): Promise<{ id: string; title: string; type: string; text: string } | null>;
  search(
    vaultId: string,
    query: string,
    limit: number,
  ): Promise<Array<{ id: string; title: string; type: string; text: string }>>;
}

export class AdventureContextService {
  constructor(private readonly resolver: AdventureSourceResolver) {}

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
