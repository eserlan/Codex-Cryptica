import type { RecentActivity } from "./CampaignService";

interface GraphEntityRecord {
  id: string;
  title: string;
  tags?: string[];
  labels?: string[];
  lastModified: number;
  filePath?: string;
  image?: string;
  thumbnail?: string;
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

function hasFrontpageMarker(tags?: string[], labels?: string[]) {
  const values = [...(tags || []), ...(labels || [])];
  return values.some((tag) => tag?.trim().toLowerCase() === "frontpage");
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
    const records = (await this.db.graphEntities
      .where("vaultId")
      .equals(vaultId)
      .toArray()) as GraphEntityRecord[];

    const recent = records
      .sort((a, b) => {
        const aPinned = hasFrontpageMarker(a.tags, a.labels);
        const bPinned = hasFrontpageMarker(b.tags, b.labels);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return (b.lastModified || 0) - (a.lastModified || 0);
      })
      .slice(0, limit);

    const contents = await Promise.all(
      recent.map((record) =>
        this.db.entityContent.get([vaultId, record.id]).catch(() => undefined),
      ),
    );

    return recent.map((record, index) => ({
      id: record.id,
      title: record.title,
      path: record.filePath || (record as any)._path?.join("/") || "",
      excerpt: getExcerpt(contents[index]?.content ?? ""),
      tags: record.tags || [],
      labels: record.labels || [],
      lastModified: record.lastModified,
      image: record.image,
      thumbnail: record.thumbnail,
    }));
  }
}

export const activityService = new ActivityServiceImplementation();
