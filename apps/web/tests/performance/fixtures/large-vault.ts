import type { Page } from "@playwright/test";

export const LARGE_VAULT_ENTITY_COUNT = 1600;
export const LARGE_VAULT_EDGE_COUNT = 9000;

export type LargeVaultEntity = {
  id: string;
  type: string;
  title: string;
  labels: string[];
  connections: {
    target: string;
    type: string;
    label: string;
    strength: number;
  }[];
  content: string;
  lore: string;
  updatedAt: number;
  modifiedAt: number;
};

/** Deterministic data: stable shape, counts, and relationship topology on every run. */
export function createLargeVaultEntities(): Record<string, LargeVaultEntity> {
  const entities: Record<string, LargeVaultEntity> = {};
  for (let index = 0; index < LARGE_VAULT_ENTITY_COUNT; index += 1) {
    const id = `benchmark-${index}`;
    entities[id] = {
      id,
      type: index % 7 === 0 ? "location" : "character",
      title: `Benchmark entity ${index}`,
      labels: index % 97 === 0 ? ["benchmark"] : [],
      connections: [],
      content: "Deterministic benchmark content.",
      lore: "",
      updatedAt: index,
      modifiedAt: index,
    };
  }
  for (let edge = 0; edge < LARGE_VAULT_EDGE_COUNT; edge += 1) {
    const source = edge % LARGE_VAULT_ENTITY_COUNT;
    const target = (source * 37 + edge * 13 + 1) % LARGE_VAULT_ENTITY_COUNT;
    if (source === target) continue;
    entities[`benchmark-${source}`].connections.push({
      target: `benchmark-${target}`,
      type: "related",
      label: "Related",
      strength: 1,
    });
  }
  return entities;
}

export async function installLargeVaultFixture(page: Page) {
  const entities = createLargeVaultEntities();
  await page.evaluate(async (fixture) => {
    const vault = (window as any).vault;
    if (!vault?.entityStore)
      throw new Error("Performance vault hook unavailable");
    vault.status = "loading";
    vault.entityStore.entities = fixture;
    vault.entityStore.initializeInboundConnections();
    vault.entityStore.rebuildIndexes();
    vault.selectedEntityId = "benchmark-42";
    vault.status = "idle";
    vault.isInitialized = true;
    (window as any).graphViewController?.syncElements();
    (window as any).graphViewController?.syncRenderHints();
    if (vault.activeVaultId) {
      await vault.persistToIndexedDB(vault.activeVaultId);
      await (window as any).cacheService?.bulkSet(
        Object.values(fixture).map((entity: any) => ({
          path: `${vault.activeVaultId}:entities/${entity.id}.md`,
          lastModified: entity.modifiedAt,
          entity,
        })),
      );
    }
  }, entities);
}
