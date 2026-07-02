import type { Entity, GuestRelationship, Map, SearchResult } from "schema";

export class GuestVaultStore {
  isInitialized = $state(false);
  publishId = $state<string | null>(null);
  vaultTitle = $state<string>("Guest Vault");
  publishedAt = $state<string>("");
  entities = $state<Entity[]>([]);
  relationships = $state<GuestRelationship[]>([]);
  maps = $state<Map[]>([]);
  canvases = $state<any[]>([]);
  assetManifest = $state<any[]>([]);
  activeTheme = $state<any>({});
  metadata = $state<any>(null);

  entitiesMap = $derived.by(() => {
    const map: Record<string, Entity> = Object.create(null);
    for (const e of this.entities) {
      map[e.id] = e;
    }
    return map;
  });

  searchQuery = $state("");

  private getEntityPath(entity: Entity): string {
    if (Array.isArray(entity._path)) return entity._path.join("/");
    if (typeof entity._path === "string" && entity._path.trim()) {
      return entity._path;
    }
    return entity.id;
  }

  private getExcerpt(entity: Entity, query: string): string | undefined {
    const queryLower = query.trim().toLowerCase();
    const sources = [entity.content ?? "", entity.lore ?? ""].filter(Boolean);

    for (const source of sources) {
      const sourceLower = source.toLowerCase();
      const matchIndex = queryLower ? sourceLower.indexOf(queryLower) : -1;
      if (matchIndex >= 0) {
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(source.length, matchIndex + query.length + 70);
        return source.slice(start, end).trim();
      }
    }

    const fallback = sources.find((source) => source.trim().length > 0);
    return fallback ? fallback.slice(0, 100).trim() : undefined;
  }

  search(query: string, limit = 20): SearchResult[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const terms = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const shouldSearchLongText = trimmedQuery.length > 1;
    const results: SearchResult[] = [];

    for (const entity of this.entities) {
      const title = (entity.title ?? "").toLowerCase();
      const aliases = (entity.aliases ?? []).join(" ").toLowerCase();
      const labels = (entity.labels ?? []).join(" ").toLowerCase();
      const entityPath = this.getEntityPath(entity);
      const path = entityPath.toLowerCase();
      const content = shouldSearchLongText
        ? (entity.content ?? "").toLowerCase()
        : "";
      const lore = shouldSearchLongText
        ? (entity.lore ?? "").toLowerCase()
        : "";

      let score = 0;
      let matchType: SearchResult["matchType"] | null = null;

      for (const term of terms) {
        if (title.startsWith(term)) {
          score += 6;
          matchType = "title";
          continue;
        }
        if (title.includes(term)) {
          score += 4;
          matchType ??= "title";
          continue;
        }
        if (aliases.includes(term) || labels.includes(term)) {
          score += 3;
          matchType ??= "aliases";
          continue;
        }
        if (path.includes(term)) {
          score += 2;
          matchType ??= "content";
          continue;
        }
        if (content.includes(term) || lore.includes(term)) {
          score += 1;
          matchType ??= "content";
        }
      }

      if (score === 0 || !matchType) continue;

      results.push({
        id: entity.id,
        title: entity.title ?? entity.id,
        type: entity.type,
        path: entityPath,
        excerpt: this.getExcerpt(entity, trimmedQuery),
        score,
        matchType,
        status: entity.status || "active",
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  searchResults = $derived.by(() => {
    if (!this.searchQuery) {
      return this.entities;
    }
    return this.search(this.searchQuery).map(
      (result) => this.entitiesMap[result.id],
    );
  });

  async loadBundle(bundle: any) {
    this.publishId = bundle.publishId;
    this.vaultTitle = bundle.vaultTitle;
    this.publishedAt = bundle.publishedAt;
    this.entities = bundle.entities || [];
    this.relationships = bundle.relationships || [];
    this.maps = bundle.maps || [];
    this.canvases = bundle.canvases || [];
    this.assetManifest = bundle.assetManifest || [];
    this.activeTheme = bundle.activeTheme || {};
    this.metadata = bundle.metadata || null;
    this.isInitialized = true;
  }

  resolveImageUrl(path: string): string {
    if (!path) return "";
    if (/^(data:|blob:|https?:)/i.test(path)) {
      return path;
    }
    const cleanPath = path.trim().replace(/^(\.\/|\/)/, "");

    const asset = this.assetManifest.find(
      (a) =>
        a.filename === cleanPath ||
        a.filename === path ||
        a.assetId === cleanPath,
    );

    const isCoverImage =
      this.metadata?.coverImage &&
      (this.metadata.coverImage === path ||
        this.metadata.coverImage.trim().replace(/^(\.\/|\/)/, "") ===
          cleanPath);

    if (!asset && !isCoverImage) {
      return "";
    }

    const assetId = asset
      ? asset.assetId
      : cleanPath.replace(/[^a-zA-Z0-9.-]/g, "_");

    const baseUrl =
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
      (typeof import.meta !== "undefined" &&
      import.meta.env?.DEV &&
      !import.meta.env?.VITEST
        ? "http://localhost:8787"
        : "https://oracle-proxy.espen-erlandsen.workers.dev");
    return `${baseUrl}/api/published/${this.publishId}/assets/${assetId}`;
  }

  clear() {
    this.isInitialized = false;
    this.publishId = null;
    this.vaultTitle = "Guest Vault";
    this.publishedAt = "";
    this.entities = [];
    this.relationships = [];
    this.maps = [];
    this.canvases = [];
    this.assetManifest = [];
    this.activeTheme = {};
    this.metadata = null;
    this.searchQuery = "";
  }
}

const KEY = "__codex_guest_vault_store__";
export const guestVault: GuestVaultStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new GuestVaultStore());
