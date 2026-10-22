import { BiomeProfileSchema } from "schema";
import type { BiomeProfile } from "biome-engine";

export interface BiomeEntitySummary {
  id: string;
  title: string;
  /** The reference biome it started from, when it had one. */
  referenceName: string | null;
  /** Last change, in epoch milliseconds, when the vault records it. */
  updatedAt: number | null;
}

export interface LoadedBiome {
  title: string;
  profile: BiomeProfile;
}

/**
 * How the Biome Explorer reads and writes saved profiles. A profile is an
 * ordinary Note entity with `kind: "biome"`; this seam keeps the store free of
 * vault details (Constitution VIII).
 */
export interface BiomeVaultGateway {
  list(): Promise<BiomeEntitySummary[]>;
  /** Null when the entity is missing or its `biome` field cannot be read. */
  load(entityId: string): Promise<LoadedBiome | null>;
  /** Returns the new entity's id. `content` is the rendered Markdown. */
  create(
    title: string,
    profile: BiomeProfile,
    content: string,
  ): Promise<string>;
  update(
    entityId: string,
    title: string,
    profile: BiomeProfile,
    content: string,
  ): Promise<void>;
  remove(entityId: string): Promise<void>;
  /** Attaches the user's own picture, using the vault's normal image path. */
  attachImage(entityId: string, file: File): Promise<void>;
  removeImage(entityId: string): Promise<void>;
  /** A displayable address for the attached picture, or "" when there is none. */
  imageUrl(entityId: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Web implementation over the vault store's public entity API
// ---------------------------------------------------------------------------

/** The slice of the vault store the gateway needs. */
export interface BiomeVaultLike {
  entities: Record<string, Record<string, unknown> & { id: string }>;
  createEntity(
    type: string,
    title: string,
    initialData: Record<string, unknown>,
  ): Promise<string>;
  updateEntity(id: string, updates: Record<string, unknown>): Promise<boolean>;
  deleteEntity(id: string): Promise<unknown>;
  saveImageToVault(
    file: File,
    entityId: string,
  ): Promise<{ image: string; thumbnail?: string }>;
  resolveImageUrl(path: string): Promise<string>;
}

export const BIOME_ENTITY_KIND = "biome";
export const BIOME_LABEL = "biome";

function readProfile(
  entity: Record<string, unknown> | undefined,
): BiomeProfile | null {
  if (!entity || entity.kind !== BIOME_ENTITY_KIND) return null;
  const parsed = BiomeProfileSchema.safeParse(entity.biome);
  return parsed.success ? parsed.data : null;
}

function labelsFor(profile: BiomeProfile, existing: unknown): string[] {
  const labels = Array.isArray(existing)
    ? existing.filter((l): l is string => typeof l === "string")
    : [];
  for (const wanted of [BIOME_LABEL, profile.reference?.name]) {
    if (wanted && !labels.includes(wanted)) labels.push(wanted);
  }
  return labels;
}

export function createWebBiomeVaultGateway(
  vault: BiomeVaultLike,
): BiomeVaultGateway {
  return {
    async list() {
      const summaries: BiomeEntitySummary[] = [];
      for (const entity of Object.values(vault.entities)) {
        const profile = readProfile(entity);
        if (!profile) continue;
        const stamp = entity.modifiedAt ?? entity.updatedAt;
        summaries.push({
          id: entity.id,
          title: String(entity.title ?? ""),
          referenceName: profile.reference?.name ?? null,
          updatedAt: typeof stamp === "number" ? stamp : null,
        });
      }
      return summaries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    },

    async load(entityId) {
      const entity = vault.entities[entityId];
      const profile = readProfile(entity);
      return profile ? { title: String(entity.title ?? ""), profile } : null;
    },

    async create(title, profile, content) {
      return vault.createEntity("note", title, {
        kind: BIOME_ENTITY_KIND,
        labels: labelsFor(profile, []),
        biome: profile,
        content,
      });
    },

    async update(entityId, title, profile, content) {
      const existing = vault.entities[entityId];
      const ok = await vault.updateEntity(entityId, {
        title,
        labels: labelsFor(profile, existing?.labels),
        biome: profile,
        content,
      });
      if (!ok) throw new Error(`Could not update biome ${entityId}`);
    },

    async remove(entityId) {
      await vault.deleteEntity(entityId);
    },

    async attachImage(entityId, file) {
      const { image, thumbnail } = await vault.saveImageToVault(file, entityId);
      const ok = await vault.updateEntity(entityId, { image, thumbnail });
      if (!ok) throw new Error(`Could not attach an image to ${entityId}`);
    },

    async removeImage(entityId) {
      const ok = await vault.updateEntity(entityId, {
        image: undefined,
        thumbnail: undefined,
      });
      if (!ok) throw new Error(`Could not remove the image from ${entityId}`);
    },

    async imageUrl(entityId) {
      const entity = vault.entities[entityId];
      const path = entity?.image ?? entity?.thumbnail;
      return typeof path === "string" && path
        ? vault.resolveImageUrl(path)
        : "";
    },
  };
}
