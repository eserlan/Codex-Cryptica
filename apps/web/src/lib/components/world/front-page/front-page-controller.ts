/**
 * front-page-controller.ts
 *
 * Coordinates AI generation flows, cover-image URL resolution,
 * and guarded world loading for the FrontPage.
 *
 * Accepts dependencies through an explicit interface so that each
 * can be replaced with a mock in unit tests.
 */

import {
  createWorldCoverPrompt,
  createWorldBriefingPrompt,
} from "./front-page-prompts";
import { buildRetrievedWorldContext } from "./front-page-context";

/** Minimal interface matching the vault store subset used by context retrieval. */
interface VaultLike {
  allEntities: Array<{ id?: string; tags?: string[]; labels?: string[] }>;
  entities: Record<
    string,
    { title?: string; content?: string; chronicle?: string }
  >;
  loadEntityContent?: (id: string) => Promise<void>;
}
import {
  isFrontpageEntity,
  buildFrontpageEntityContext,
  resolveBriefingSource,
} from "./front-page-entities";

// ---------------------------------------------------------------------------
// Dependency interface
// ---------------------------------------------------------------------------

export interface FrontPageControllerDeps {
  worldStore: {
    load: (vaultId: string, limit: number) => Promise<void>;
    saveDescription: (description: string) => Promise<void>;
    generateBriefing: (prompt: string) => Promise<string>;
    generateCoverImage: (prompt: string) => Promise<string | void>;
    setCoverImage: (imagePath: string) => Promise<void>;
    metadata:
      | { name?: string; description?: string; coverImage?: string }
      | null
      | undefined;
    frontPageEntity:
      | { id?: string; chronicle?: string; content?: string }
      | null
      | undefined;
    error: string | null;
    isLoading: boolean;
    isSaving: boolean;
  };
  vault: VaultLike & {
    activeVaultId: string | null;
    vaultName: string | null;
    saveImageToVault: (
      file: File,
      category: string,
      filename: string,
    ) => Promise<{ image: string }>;
    resolveImageUrl: (imagePath: string) => Promise<string | undefined>;
  };
  themeStore: {
    activeTheme: { name: string; description: string };
  };
  uiStore: {
    confirm: (opts: {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
    }) => Promise<boolean>;
  };
}

// ---------------------------------------------------------------------------
// Controller
//
// Uses a plain class with injected deps.  The class itself holds no reactive
// Svelte state — it is a pure coordination layer that the Svelte component
// calls from event handlers and $effects.
// ---------------------------------------------------------------------------

export class FrontPageController {
  constructor(private deps: FrontPageControllerDeps) {}

  // -- World loading with stale-request guard --------------------------------

  async loadWorld(vaultId: string, recentLimit: number): Promise<void> {
    await this.deps.worldStore.load(vaultId, recentLimit);
  }

  // -- Briefing generation ---------------------------------------------------

  async generateBriefing(
    retrievedWorldContext: string,
  ): Promise<{ success: boolean; warning?: string }> {
    const { worldStore, themeStore } = this.deps;

    const activeTheme = themeStore.activeTheme;
    const themeDescription = activeTheme.description.trim();
    const worldName =
      worldStore.metadata?.name?.trim() || this.deps.vault.vaultName || "";

    const prompt = createWorldBriefingPrompt(
      worldName,
      activeTheme.name,
      themeDescription,
      retrievedWorldContext || "No additional context was retrieved.",
    );

    const generated = await worldStore.generateBriefing(prompt);

    if (worldStore.error) {
      return { success: false };
    }

    return { success: !!generated.trim() };
  }

  // -- Cover image generation ------------------------------------------------

  async generateCover(
    retrievedWorldContext: string,
  ): Promise<{ success: boolean; warning?: string }> {
    const { worldStore, themeStore, vault } = this.deps;

    const themeName = themeStore.activeTheme.name;
    const themeDescription = themeStore.activeTheme.description.trim();
    const briefingText =
      resolveBriefingSource(
        worldStore.metadata ?? {},
        worldStore.frontPageEntity,
      ) || "No world briefing provided yet.";
    const worldName =
      worldStore.metadata?.name?.trim() || vault.vaultName || "";

    const prompt = createWorldCoverPrompt(
      worldName,
      themeName,
      themeDescription,
      briefingText,
      retrievedWorldContext,
    );

    try {
      await worldStore.generateCoverImage(prompt);
      if (worldStore.error) {
        return { success: false };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        "[front-page-controller] Cover generation failed:",
        message,
      );
      return {
        success: false,
        warning: `Failed to generate cover: ${message}`,
      };
    }
  }

  // -- Cover image upload ----------------------------------------------------

  async uploadCover(file: File): Promise<{ success: boolean }> {
    const { vault, worldStore } = this.deps;
    const vaultId = vault.activeVaultId;
    if (!vaultId) return { success: false };

    const saved = await vault.saveImageToVault(
      file,
      `world-${vaultId}`,
      file.name,
    );
    await worldStore.setCoverImage(saved.image);
    return { success: true };
  }

  // -- Resolve cover image URL -----------------------------------------------

  async resolveCoverImageUrl(coverImage: string | undefined): Promise<string> {
    if (!coverImage) return "";
    const url = await this.deps.vault.resolveImageUrl(coverImage);
    return url || "";
  }

  // -- Build frontpage entity context ----------------------------------------

  async buildFrontpageEntityContextAsync(): Promise<string> {
    const { vault } = this.deps;
    const frontpageEntities = vault.allEntities
      .filter(isFrontpageEntity)
      .sort(
        (a, b) =>
          ((b as any).lastModified || 0) - ((a as any).lastModified || 0),
      );
    if (frontpageEntities.length === 0) return "";

    if (vault.loadEntityContent) {
      await Promise.all(
        frontpageEntities.map((entity) => vault.loadEntityContent!(entity.id!)),
      );
    }

    const loadedEntities = frontpageEntities.map((entity) => {
      const loaded = vault.entities[entity.id!] || entity;
      return {
        title: loaded.title,
        chronicle: (loaded as any).chronicle,
        content: loaded.content,
      };
    });

    return buildFrontpageEntityContext(loadedEntities);
  }

  // -- Build retrieved world context -----------------------------------------

  async buildRetrievedWorldContext(
    frontpageEntityContext: string,
    isImage = false,
  ) {
    const { vault, worldStore, themeStore } = this.deps;
    const worldName =
      worldStore.metadata?.name?.trim() || vault.vaultName || "";
    const themeName = themeStore.activeTheme.name;

    return buildRetrievedWorldContext(
      vault,
      worldName,
      themeName,
      worldStore.frontPageEntity?.id,
      frontpageEntityContext,
      isImage,
    );
  }
}
