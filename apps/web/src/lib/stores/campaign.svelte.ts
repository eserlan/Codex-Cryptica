import {
  ActivityServiceImplementation,
  CampaignServiceImplementation,
  type CampaignMetadata,
  type FrontPageEntity,
  type RecentActivity,
} from "@codex/vault-engine";
import { entityDb } from "$lib/utils/entity-db";
import { vault } from "$lib/stores/vault.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { imageGenerationService } from "$lib/services/ai/image-generation.service";
import { textGenerationService } from "$lib/services/ai/text-generation.service";

const CAMPAIGN_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const campaignService = new CampaignServiceImplementation({
  db: entityDb,
  imageGenerator: imageGenerationService,
  assetManager: {
    saveImageToVault: async (blob, entityId, originalName) => {
      return vault.saveImageToVault(blob, entityId, originalName);
    },
  },
  getApiKey: () => oracle.effectiveApiKey || "",
  getImageModel: () => CAMPAIGN_IMAGE_MODEL,
  getSummaryModel: () => oracle.modelName,
  getSummaryGenerator: () => textGenerationService,
});

const activityService = new ActivityServiceImplementation({
  db: entityDb,
});

export class CampaignStore {
  activeVaultId = $state<string | null>(null);
  metadata = $state<CampaignMetadata | null>(null);
  frontPageEntity = $state<FrontPageEntity | null>(null);
  recentActivity = $state<RecentActivity[]>([]);
  isLoading = $state(false);
  isSaving = $state(false);
  error = $state<string | null>(null);

  constructor(
    private campaignServiceImpl: CampaignServiceImplementation = campaignService,
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
        this.campaignServiceImpl.getMetadata(vaultId),
        this.campaignServiceImpl.getFrontPageEntity(vaultId),
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
      this.error = err?.message || "Failed to load campaign front page.";
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
      await this.campaignServiceImpl.updateMetadata(this.activeVaultId, {
        description,
      });
      await this.refresh();
    } catch (err: any) {
      this.error = err?.message || "Failed to save campaign summary.";
    } finally {
      this.isSaving = false;
    }
  }

  async setCoverImage(coverImage: string) {
    if (!this.activeVaultId) return;
    this.isSaving = true;
    this.error = null;
    try {
      await this.campaignServiceImpl.updateMetadata(this.activeVaultId, {
        coverImage,
      });
      await this.refresh();
    } catch (err: any) {
      this.error = err?.message || "Failed to save campaign image.";
    } finally {
      this.isSaving = false;
    }
  }

  async generateDescription(promptBase: string) {
    if (!this.activeVaultId) return "";
    this.isSaving = true;
    this.error = null;
    try {
      const generated =
        await this.campaignServiceImpl.generateCampaignDescription(
          this.activeVaultId,
          promptBase,
        );
      await this.refresh();
      return generated;
    } catch (err: any) {
      this.error = err?.message || "Failed to generate campaign summary.";
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
      const image = await this.campaignServiceImpl.generateCoverImage(
        this.activeVaultId,
        promptBase,
      );
      await this.refresh();
      return image;
    } catch (err: any) {
      this.error = err?.message || "Failed to generate cover image.";
      return "";
    } finally {
      this.isSaving = false;
    }
  }
}

const CAMPAIGN_KEY = "__codex_campaign_store_instance__";
export const campaignStore: CampaignStore =
  (globalThis as any)[CAMPAIGN_KEY] ??
  ((globalThis as any)[CAMPAIGN_KEY] = new CampaignStore());
