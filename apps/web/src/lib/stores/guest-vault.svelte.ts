import type { Entity, GuestRelationship, Map } from "schema";

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

  entitiesMap = $derived.by(() => {
    const map: Record<string, Entity> = Object.create(null);
    for (const e of this.entities) {
      map[e.id] = e;
    }
    return map;
  });

  private searchIndex: any = null;
  searchQuery = $state("");

  searchResults = $derived.by(() => {
    if (!this.searchQuery) {
      return this.entities;
    }
    if (!this.searchIndex) return [];
    try {
      const results = this.searchIndex.search(this.searchQuery);
      const matchedIds = new Set<string>();
      results.forEach((r: any) => {
        const ids = r.result || [];
        ids.forEach((id: any) => matchedIds.add(id.toString()));
      });
      return this.entities.filter((e) => matchedIds.has(e.id));
    } catch (err) {
      console.error("[GuestVaultStore] Search failed:", err);
      return [];
    }
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
    this.isInitialized = true;

    try {
      const FlexSearch = (await import("flexsearch")).default;
      this.searchIndex = new FlexSearch.Document({
        document: {
          id: "id",
          index: ["title", "content", "lore", "keywords"],
          store: true,
        },
      });

      for (const entity of this.entities) {
        this.searchIndex.add({
          id: entity.id,
          title: entity.title,
          content: entity.content || "",
          lore: entity.lore || "",
          keywords:
            (entity.labels || []).join(" ") +
            " " +
            (entity.aliases || []).join(" "),
        });
      }
    } catch (err) {
      console.error("[GuestVaultStore] Failed to build search index:", err);
    }
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
    if (asset) {
      const baseUrl = "https://oracle-proxy.espen-erlandsen.workers.dev";
      return `${baseUrl}/api/published/${this.publishId}/assets/${asset.assetId}`;
    }
    return "";
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
    this.searchIndex = null;
    this.searchQuery = "";
  }
}

const KEY = "__codex_guest_vault_store__";
export const guestVault: GuestVaultStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new GuestVaultStore());
