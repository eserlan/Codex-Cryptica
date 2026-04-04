import {
  ActivityServiceImplementation,
  WorldServiceImplementation,
  type WorldMetadata,
  type FrontPageEntity,
  type RecentActivity,
} from "@codex/vault-engine";
import { entityDb } from "$lib/utils/entity-db";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { imageGenerationService } from "$lib/services/ai/image-generation.service";
import { textGenerationService } from "$lib/services/ai/text-generation.service";

const WORLD_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const worldService = new WorldServiceImplementation({
  db: entityDb,
  imageGenerator: imageGenerationService,
  assetManager: {
    saveImageToVault: async (blob, entityId, originalName) => {
      return vault.saveImageToVault(blob, entityId, originalName);
    },
  },
  getApiKey: () => oracle.effectiveApiKey || "",
  getImageModel: () => WORLD_IMAGE_MODEL,
  getSummaryModel: () => oracle.modelName,
  getSummaryGenerator: () => textGenerationService,
});

const activityService = new ActivityServiceImplementation({
  db: entityDb,
});

export class WorldStore {
  activeVaultId = $state<string | null>(null);
  metadata = $state<WorldMetadata | null>(null);
  frontPageEntity = $state<FrontPageEntity | null>(null);
  recentActivity = $state<RecentActivity[]>([]);
  isLoading = $state(false);
  isSaving = $state(false);
  error = $state<string | null>(null);

  constructor(
    private worldServiceImpl: WorldServiceImplementation = worldService,
    private activityServiceImpl: ActivityServiceImplementation = activityService,
  ) {}

  private loadSequence = 0;

  async load(vaultId: string | null, limit = 6) {
    const loadId = ++this.loadSequence;
    this.activeVaultId = vaultId;
    if (!vaultId) {
      this.metadata = null;
      this.frontPageEntity = null;
      this.recentActivity = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const [metadata, frontPageEntity, recentActivity] = await Promise.all([
        this.worldServiceImpl.getMetadata(vaultId),
        this.worldServiceImpl.getFrontPageEntity(vaultId),
        this.activityServiceImpl.getRecentActivity(vaultId, limit),
      ]);

      if (loadId !== this.loadSequence || this.activeVaultId !== vaultId) {
        return;
      }

      this.metadata = metadata;
      this.frontPageEntity = frontPageEntity;
      this.recentActivity = recentActivity;
    } catch (err: any) {
      if (loadId !== this.loadSequence || this.activeVaultId !== vaultId) {
        return;
      }
      this.error = err?.message || "Failed to load world front page.";
    } finally {
      if (loadId === this.loadSequence && this.activeVaultId === vaultId) {
        this.isLoading = false;
      }
    }
  }

  async refresh(limit = 6) {
    await this.load(this.activeVaultId, limit);
  }

  async saveDescription(description: string) {
    if (!this.activeVaultId) return;
    this.isSaving = true;
    this.error = null;
    try {
      await this.worldServiceImpl.updateMetadata(this.activeVaultId, {
        description,
      });
      await this.refresh();
    } catch (err: any) {
      this.error = err?.message || "Failed to save world briefing.";
    } finally {
      this.isSaving = false;
    }
  }

  async setCoverImage(coverImage: string) {
    if (!this.activeVaultId) return;
    this.isSaving = true;
    this.error = null;
    try {
      await this.worldServiceImpl.updateMetadata(this.activeVaultId, {
        coverImage,
      });
      await this.refresh();
    } catch (err: any) {
      this.error = err?.message || "Failed to save world image.";
    } finally {
      this.isSaving = false;
    }
  }

  async generateBriefing(promptBase: string) {
    if (!this.activeVaultId) return "";
    this.isSaving = true;
    this.error = null;
    try {
      const generated = await this.worldServiceImpl.generateWorldBriefing(
        this.activeVaultId,
        promptBase,
      );
      await this.refresh();
      return generated;
    } catch (err: any) {
      this.error = err?.message || "Failed to generate world briefing.";
      return "";
    } finally {
      this.isSaving = false;
    }
  }

  async generateCoverImage(promptBase: string) {
    if (!this.activeVaultId) return "";
    this.isSaving = true;
    this.error = null;
    try {
      const image = await this.worldServiceImpl.generateCoverImage(
        this.activeVaultId,
        promptBase,
      );
      await this.refresh();
      return image;
    } catch (err: any) {
      this.error = err?.message || "Failed to generate world image.";
      return "";
    } finally {
      this.isSaving = false;
    }
  }
}

const WORLD_KEY = "__codex_world_store_instance__";
export const worldStore: WorldStore =
  (globalThis as any)[WORLD_KEY] ??
  ((globalThis as any)[WORLD_KEY] = new WorldStore());
