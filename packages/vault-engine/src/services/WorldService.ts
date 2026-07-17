import Dexie from "dexie";

interface GraphEntityRecord {
  id: string;
  title: string;
  vaultId: string;
  type?: string;
  tags?: string[];
  labels?: string[];
  lastModified: number;
  filePath?: string;
  image?: string;
  thumbnail?: string;
  status?: "active" | "draft";
}

export interface VaultMetadataRecord {
  id: string;
  name?: string;
  tagline?: string;
  description?: string;
  coverImage?: string;
  lastModified: number;
}

export interface WorldMetadata {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  coverImage?: string;
}

export interface RecentActivity {
  id: string;
  title: string;
  path: string;
  excerpt: string;
  type?: string;
  tags: string[];
  labels?: string[];
  lastModified: number;
  image?: string;
  thumbnail?: string;
}

export interface FrontPageEntity {
  id: string;
  content: string;
  chronicle: string;
  image?: string;
  thumbnail?: string;
}

export interface WorldServiceDependencies {
  db?: {
    vaultMetadata: {
      get(id: string): Promise<VaultMetadataRecord | undefined>;
      put(record: VaultMetadataRecord): Promise<unknown>;
    };
    graphEntities: {
      where(index: string): any;
      orderBy(index: string): any;
    };
    entityContent: {
      get(key: [string, string]): Promise<{ content: string } | undefined>;
    };
  };
  recentActivityService?: {
    getRecentActivity(
      vaultId: string,
      limit: number,
    ): Promise<RecentActivity[]>;
  };
  imageGenerator?: {
    generateImage(
      apiKey: string,
      prompt: string,
      modelName: string,
    ): Promise<Blob>;
  };
  assetManager?: {
    saveImageToVault(
      blob: Blob,
      entityId: string,
      originalName?: string,
    ): Promise<{ image: string; thumbnail: string }>;
  };
  getApiKey?: () => string;
  getImageModel?: () => string;
  getSummaryModel?: () => string;
  getSummaryGenerator?: () => {
    generateResponse(
      apiKey: string,
      query: string,
      history: any[],
      context: string,
      modelName: string,
      onUpdate: (partial: string) => void,
      demoMode?: boolean,
      categories?: string[],
    ): Promise<void>;
  } | null;
  now?: () => number;
}

const createMissingDb = (): WorldServiceDependencies["db"] => {
  const fail = (method: string) => () => {
    throw new Error(
      `WorldService requires an EntityDb instance with ${method} support`,
    );
  };

  return {
    vaultMetadata: {
      get: fail("vaultMetadata.get") as any,
      put: fail("vaultMetadata.put") as any,
    } as any,
    graphEntities: {
      where: fail("graphEntities.where") as any,
      orderBy: fail("graphEntities.orderBy") as any,
    } as any,
    entityContent: {
      get: fail("entityContent.get") as any,
    } as any,
  };
};

function getEntityPath(
  record: Partial<GraphEntityRecord> & { filePath?: string },
) {
  return record.filePath || (record as any)._path?.join("/") || "";
}

function getExcerpt(content: string, max = 150): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

async function fetchFrontpageRecords(
  db: NonNullable<WorldServiceDependencies["db"]>,
  vaultId: string,
) {
  const [tagged, labeled] = await Promise.all([
    db.graphEntities
      .where("tags")
      .equals("frontpage")
      .and((record: GraphEntityRecord) => record.vaultId === vaultId)
      .toArray(),
    db.graphEntities
      .where("labels")
      .equals("frontpage")
      .and((record: GraphEntityRecord) => record.vaultId === vaultId)
      .toArray(),
  ]);

  const unique = new Map<string, GraphEntityRecord>();
  for (const record of [...tagged, ...labeled]) {
    unique.set(record.id, record);
  }

  return [...unique.values()].sort(
    (a, b) => (b.lastModified || 0) - (a.lastModified || 0),
  );
}

export class WorldServiceImplementation {
  constructor(private deps: WorldServiceDependencies = {}) {}

  private getNow() {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  private get db() {
    return this.deps.db ?? createMissingDb()!;
  }

  async getMetadata(vaultId: string): Promise<WorldMetadata> {
    const record = (await this.db.vaultMetadata.get(vaultId)) as
      | VaultMetadataRecord
      | undefined;

    return {
      id: vaultId,
      name: record?.name?.trim() || "",
      tagline: record?.tagline,
      description: record?.description,
      coverImage: record?.coverImage,
    };
  }

  async updateMetadata(
    vaultId: string,
    metadata: Partial<WorldMetadata>,
  ): Promise<void> {
    const existing = (await this.db.vaultMetadata.get(vaultId)) as
      | VaultMetadataRecord
      | undefined;

    const next: VaultMetadataRecord = {
      id: vaultId,
      name: metadata.name ?? existing?.name ?? undefined,
      tagline: metadata.tagline ?? existing?.tagline ?? undefined,
      description: metadata.description ?? existing?.description ?? undefined,
      coverImage: metadata.coverImage ?? existing?.coverImage ?? undefined,
      lastModified: this.getNow(),
    };

    await this.db.vaultMetadata.put(next);
  }

  async getFrontPageEntity(vaultId: string): Promise<FrontPageEntity | null> {
    const records = await fetchFrontpageRecords(this.db, vaultId);

    if (records.length === 0) return null;

    const selected = records[0];
    const contentRecord = await this.db.entityContent.get([
      vaultId,
      selected.id,
    ]);

    return {
      id: selected.id,
      content: contentRecord?.content?.trim() || "",
      chronicle: contentRecord?.content?.trim() || "",
      image: selected.image,
      thumbnail: selected.thumbnail,
    };
  }

  async getRecentActivity(
    vaultId: string,
    limit: number,
  ): Promise<RecentActivity[]> {
    if (this.deps.recentActivityService) {
      return this.deps.recentActivityService.getRecentActivity(vaultId, limit);
    }

    const pinnedRecords = await fetchFrontpageRecords(this.db, vaultId);
    const pinnedIds = new Set(pinnedRecords.map((record) => record.id));
    const candidateLimit = Math.max(
      limit * 4,
      limit + pinnedRecords.length,
      24,
    );
    const recentCandidates = (await this.db.graphEntities
      .where("[vaultId+lastModified]")
      .between([vaultId, Dexie.minKey], [vaultId, Dexie.maxKey])
      .reverse()
      .limit(candidateLimit)
      .toArray()) as GraphEntityRecord[];

    // ⚡ Bolt Optimization: Replace chained spread/filter and O(N log N) sorting
    // Since pinnedRecords and recentCandidates are already chronologically sorted
    // from Dexie and sorted manually in fetchFrontpageRecords, we can fill our
    // target array iteratively in O(N).

    const limitedRecent: GraphEntityRecord[] = [];

    // First add pinned records, up to the limit
    for (let i = 0; i < pinnedRecords.length; i++) {
      if (limitedRecent.length >= limit) break;
      limitedRecent.push(pinnedRecords[i]);
    }

    // Then fill the remaining slots with non-pinned recent candidates
    const len = recentCandidates.length;
    for (let i = 0; i < len; i++) {
      if (limitedRecent.length >= limit) break;
      const record = recentCandidates[i];
      if (!pinnedIds.has(record.id)) {
        limitedRecent.push(record);
      }
    }

    const contentRecords = await Promise.all(
      limitedRecent.map((record) =>
        this.db.entityContent.get([vaultId, record.id]).catch(() => null),
      ),
    );

    return limitedRecent.map((record, index) => {
      const content = contentRecords[index]?.content ?? "";
      const path = getEntityPath(record);
      return {
        id: record.id,
        title: record.title,
        path,
        excerpt: getExcerpt(content || ""),
        type: record.type,
        tags: record.tags || [],
        labels: record.labels || [],
        lastModified: record.lastModified,
        image: record.image,
        thumbnail: record.thumbnail,
      };
    });
  }

  async generateCoverImage(
    vaultId: string,
    promptBase: string,
  ): Promise<string> {
    const imageGenerator = this.deps.imageGenerator;
    const assetManager = this.deps.assetManager;
    if (!imageGenerator || !assetManager) {
      throw new Error(
        "WorldService.generateCoverImage requires imageGenerator and assetManager dependencies",
      );
    }

    const apiKey = this.deps.getApiKey?.() ?? "";
    const modelName =
      this.deps.getImageModel?.() ?? "gemini-2.0-flash-exp-image-generation";
    const blob = await imageGenerator.generateImage(
      apiKey,
      promptBase,
      modelName,
    );
    const assetName = `world-${vaultId}-${this.getNow()}`;
    const saved = await assetManager.saveImageToVault(
      blob,
      assetName,
      assetName,
    );

    await this.updateMetadata(vaultId, { coverImage: saved.image });
    return saved.image;
  }

  async generateWorldBriefing(
    vaultId: string,
    promptBase: string,
  ): Promise<string> {
    const generator = this.deps.getSummaryGenerator?.();
    if (!generator) {
      throw new Error(
        "WorldService.generateWorldBriefing requires getSummaryGenerator dependency",
      );
    }

    let result = "";
    await generator.generateResponse(
      this.deps.getApiKey?.() ?? "",
      promptBase,
      [],
      "",
      this.deps.getSummaryModel?.() || "gemini-2.0-flash",
      (partial) => {
        result = partial;
      },
      false,
      undefined,
    );

    const description = result.trim();
    if (description) {
      await this.updateMetadata(vaultId, { description });
    }
    return description;
  }
}

export const worldService = new WorldServiceImplementation();
