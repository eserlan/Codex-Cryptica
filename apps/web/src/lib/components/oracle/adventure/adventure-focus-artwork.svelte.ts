import type { ComponentProps } from "svelte";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import type { AdventureSession } from "@codex/adventure-engine";
import { featureFlags } from "#lib/stores/feature-flags.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { artworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
import { createDisplayService } from "#lib/services/adventure/artwork/create-display-service.js";
import { defaultArtworkCatalogue } from "#lib/services/adventure/artwork/default-artwork-catalogue.js";
import { summarizeArtworkCues } from "#lib/services/adventure/artwork/artwork-cue-summary.js";
import { artworkDemandReporter } from "#lib/services/adventure/artwork/artwork-demand-reporter.js";
import {
  selectPresentNpcPortrait,
  type ArtworkNpcEntity,
  type NpcPortraitSelection,
} from "#lib/services/adventure/artwork/npc-portrait-selection.js";
import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
import type AdventureArtworkFeature from "./artwork/AdventureArtworkFeature.svelte";

const defaultDependencies = {
  preferences: artworkPreferences,
  createDisplay: createDisplayService,
  getCatalogue: () => defaultArtworkCatalogue.get(),
  isEnabled: () => featureFlags.isEnabled("adventureArtwork"),
  selectPortrait: selectPresentNpcPortrait,
  summarize: summarizeArtworkCues,
  resolveImage: (path: string) => vault.resolveImageUrl(path),
  report: (
    ...args: Parameters<typeof artworkDemandReporter.reportFromSummary>
  ) => artworkDemandReporter.reportFromSummary(...args),
};

interface ArtworkContext {
  session: AdventureSession | null;
  activeVaultId: string | null | undefined;
  entities: Readonly<Record<string, ArtworkNpcEntity>>;
  theme: string | undefined;
}

/** View-local catalogue subscriptions and the lifetime of the current NPC preview. */
export class AdventureFocusArtwork {
  private readonly dependencies: typeof defaultDependencies;
  private enabled = $state(true);
  private catalogue = $state<readonly ArtworkAsset[]>([]);
  private display = $state<ArtworkDisplayService>();
  portrait =
    $state<ComponentProps<typeof AdventureArtworkFeature>["portrait"]>(null);
  private selection = $derived.by(() =>
    this.flagEnabled
      ? this.dependencies.selectPortrait(...this.matchArguments)
      : null,
  );
  cueSummary = $derived.by(() =>
    this.flagEnabled
      ? this.dependencies.summarize(...this.matchArguments)
      : null,
  );

  constructor(
    private readonly getContext: () => ArtworkContext,
    dependencies: Partial<typeof defaultDependencies> = {},
  ) {
    this.dependencies = { ...defaultDependencies, ...dependencies };
    this.enabled = this.dependencies.preferences.enabled;
    $effect(() => {
      this.enabled = this.dependencies.preferences.enabled;
      return this.dependencies.preferences.subscribe((value) => {
        this.enabled = value;
      });
    });
    $effect(() => this.loadResources());
    $effect(() => {
      this.dependencies.report(
        this.cueSummary,
        this.getContext().session?.id ?? null,
      );
    });
    $effect(() => this.loadPortrait());
  }

  get flagEnabled(): boolean {
    return this.dependencies.isEnabled();
  }

  private get matchArguments() {
    const { session, activeVaultId, entities, theme } = this.getContext();
    return [
      session,
      activeVaultId,
      entities,
      this.enabled,
      theme,
      this.catalogue,
    ] as const;
  }

  private loadResources(): (() => void) | undefined {
    if (!this.flagEnabled) {
      this.display = undefined;
      this.catalogue = [];
      return;
    }
    let active = true;
    let resources: ReturnType<typeof createDisplayService> | undefined;
    try {
      resources = this.dependencies.createDisplay(
        this.dependencies.preferences,
      );
      this.display = resources.display;
    } catch {
      /* Private Vault images still work. */
    }
    void this.dependencies.getCatalogue().then((assets) => {
      if (active && assets) this.catalogue = assets;
    });
    return () => {
      active = false;
      resources?.destroy();
    };
  }

  private loadPortrait(): (() => void) | undefined {
    const selection = this.selection;
    const display = this.display;
    this.portrait = null;
    if (!selection) return;
    const controller = new AbortController();
    let owned: ArtworkBlobHandle | null = null;
    if (selection.kind === "vault") {
      void this.loadPrivatePortrait(selection, controller.signal).catch(
        () => {},
      );
    } else if (display) {
      void this.loadPublicPortrait(
        selection,
        display,
        controller.signal,
        (handle) => {
          owned = handle;
        },
      ).catch(() => {});
    }
    return () => {
      controller.abort();
      owned?.release();
    };
  }

  private async loadPrivatePortrait(
    selection: Extract<NpcPortraitSelection, { kind: "vault" }>,
    signal: AbortSignal,
  ): Promise<void> {
    const url = await this.dependencies.resolveImage(selection.image);
    if (signal.aborted || !url) return;
    this.portrait = {
      name: selection.name,
      src: url,
      alt: selection.alt,
      description: selection.description,
    };
  }

  private async loadPublicPortrait(
    selection: Extract<NpcPortraitSelection, { kind: "catalogue" }>,
    display: ArtworkDisplayService,
    signal: AbortSignal,
    retain: (handle: ArtworkBlobHandle) => void,
  ): Promise<void> {
    const handle = await display.load(selection.asset, signal, "preview");
    if (signal.aborted) {
      handle?.release();
      return;
    }
    if (!handle) return;
    retain(handle);
    this.portrait = {
      name: selection.name,
      src: handle.url,
      alt: selection.alt,
      aiLabel: selection.aiLabel,
      credits: selection.credits,
      description: selection.description,
      loadFull: (fullSignal) =>
        display.load(selection.asset, fullSignal, "display"),
    };
  }
}
