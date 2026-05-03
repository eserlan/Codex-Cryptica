import Dexie from "dexie";
import type { RecentActivity } from "./WorldService";

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

export interface ActivityServiceDependencies {
  db?: {
    graphEntities: {
      where(index: string): any;
      orderBy(index: string): {
        toArray(): Promise<GraphEntityRecord[]>;
      };
    };
    entityContent: {
      get(key: [string, string]): Promise<{ content: string } | undefined>;
    };
  };
}

function getExcerpt(content: string, max = 150): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

async function fetchFrontpageRecords(
  db: NonNullable<ActivityServiceDependencies["db"]>,
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

export class ActivityServiceImplementation {
  constructor(private deps: ActivityServiceDependencies = {}) {}

  private get db() {
    if (!this.deps.db) {
      throw new Error("ActivityService requires an EntityDb instance");
    }
    return this.deps.db;
  }

  async getRecentActivity(
    vaultId: string,
    limit: number,
  ): Promise<RecentActivity[]> {
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

    const contents = await Promise.all(
      limitedRecent.map((record) =>
        this.db.entityContent.get([vaultId, record.id]).catch(() => undefined),
      ),
    );

    return limitedRecent.map((record, index) => ({
      id: record.id,
      title: record.title,
      path: record.filePath || (record as any)._path?.join("/") || "",
      excerpt: getExcerpt(contents[index]?.content ?? ""),
      type: record.type,
      tags: record.tags || [],
      labels: record.labels || [],
      lastModified: record.lastModified,
      image: record.image,
      thumbnail: record.thumbnail,
    }));
  }
}

export const activityService = new ActivityServiceImplementation();
