import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import type { ArtworkBlobHandle } from "#lib/services/adventure/artwork/ports.js";
import type { ArtworkDisplayService } from "#lib/services/adventure/artwork/artwork-display-service.js";
import type { NpcPortraitSelection } from "#lib/services/adventure/artwork/npc-portrait-selection.js";
import { ArtworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
import { AdventureFocusArtwork } from "./adventure-focus-artwork.svelte.js";

const disposers: Array<() => void> = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

function setup(
  overrides: NonNullable<
    ConstructorParameters<typeof AdventureFocusArtwork>[1]
  > = {},
) {
  const preferences = new ArtworkPreferences(null);
  const destroy = vi.fn();
  const load = vi.fn().mockResolvedValue(null);
  const selectPortrait = vi
    .fn<() => NpcPortraitSelection | null>()
    .mockReturnValue(null);
  const resolveImage = vi.fn().mockResolvedValue("vault:portrait");
  const getCatalogue = vi.fn().mockResolvedValue(null);
  const dependencies = {
    preferences,
    createDisplay: vi.fn().mockReturnValue({ display: { load }, destroy }),
    getCatalogue,
    selectPortrait,
    resolveImage,
    isEnabled: () => true,
    summarize: vi.fn().mockReturnValue(null),
    report: vi.fn(),
    ...overrides,
  };
  let artwork!: AdventureFocusArtwork;
  const dispose = $effect.root(() => {
    artwork = new AdventureFocusArtwork(
      () => ({
        session: null,
        activeVaultId: "vault-1",
        entities: {},
        theme: "fantasy",
      }),
      dependencies,
    );
  });
  disposers.push(dispose);
  flushSync();
  return {
    artwork,
    dependencies,
    dispose,
    load,
    destroy,
    selectPortrait,
    resolveImage,
    preferences,
  };
}

const privatePortrait: NpcPortraitSelection = {
  kind: "vault",
  name: "Mira",
  image: "images/mira.webp",
  alt: "Mira",
  subjectKey: "mira",
  description: "The ferryman",
};

describe("AdventureFocusArtwork", () => {
  it("resolves private portraits and releases its preference and resource subscriptions", async () => {
    const preferences = new ArtworkPreferences(null);
    const unsubscribe = vi.fn();
    vi.spyOn(preferences, "subscribe").mockReturnValue(unsubscribe);
    const { artwork, dispose, destroy, resolveImage } = setup({
      preferences,
      selectPortrait: () => privatePortrait,
    });
    await vi.waitFor(() =>
      expect(artwork.portrait?.src).toBe("vault:portrait"),
    );
    expect(resolveImage).toHaveBeenCalledWith("images/mira.webp");
    expect(artwork.portrait?.description).toBe("The ferryman");
    dispose();
    expect(destroy).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("loads a catalogue preview, provides the full image loader and releases owned URLs", async () => {
    const preview = { url: "blob:preview", release: vi.fn() };
    const full = { url: "blob:full", release: vi.fn() };
    const load = vi.fn().mockResolvedValueOnce(preview).mockResolvedValue(full);
    const asset = { id: "portrait-1" } as ArtworkAsset;
    const { artwork, dispose } = setup({
      selectPortrait: () => ({
        ...privatePortrait,
        kind: "catalogue",
        asset,
        aiLabel: "AI illustration",
        credits: "Credit",
      }),
      createDisplay: vi
        .fn()
        .mockReturnValue({ display: { load }, destroy: vi.fn() }),
    });
    await vi.waitFor(() => expect(artwork.portrait?.src).toBe("blob:preview"));
    expect(load).toHaveBeenCalledWith(
      asset,
      expect.any(AbortSignal),
      "preview",
    );
    const signal = new AbortController().signal;
    expect(await artwork.portrait?.loadFull?.(signal)).toBe(full);
    expect(load).toHaveBeenLastCalledWith(asset, signal, "display");
    expect(artwork.portrait?.credits).toBe("Credit");
    dispose();
    expect(preview.release).toHaveBeenCalledOnce();
    expect(full.release).not.toHaveBeenCalled();
  });

  it("releases late public image results after the view is destroyed", async () => {
    let resolve!: (handle: ArtworkBlobHandle) => void;
    const load = vi.fn<ArtworkDisplayService["load"]>(
      () => new Promise<ArtworkBlobHandle>((done) => (resolve = done)),
    );
    const { artwork, dispose } = setup({
      selectPortrait: () => ({
        ...privatePortrait,
        kind: "catalogue",
        asset: {} as ArtworkAsset,
        aiLabel: "AI illustration",
        credits: "Credit",
      }),
      createDisplay: vi
        .fn()
        .mockReturnValue({ display: { load }, destroy: vi.fn() }),
    });
    dispose();
    const handle = { url: "blob:late", release: vi.fn() };
    resolve(handle);
    await vi.waitFor(() => expect(handle.release).toHaveBeenCalledOnce());
    expect(artwork.portrait).toBeNull();
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
  });

  it("ignores private portrait results that arrive after unmount", async () => {
    let resolve!: (url: string) => void;
    const { artwork, dispose } = setup({
      selectPortrait: () => privatePortrait,
      resolveImage: () => new Promise<string>((done) => (resolve = done)),
    });
    dispose();
    resolve("vault:late");
    await Promise.resolve();
    expect(artwork.portrait).toBeNull();
  });

  it("keeps private portraits available when public artwork services are unavailable", async () => {
    const { artwork } = setup({
      selectPortrait: () => privatePortrait,
      createDisplay: () => {
        throw new Error("cache unavailable");
      },
    });
    await vi.waitFor(() =>
      expect(artwork.portrait?.src).toBe("vault:portrait"),
    );
  });

  it("does not initialise artwork resources when the feature flag is off", () => {
    const { artwork, dependencies } = setup({ isEnabled: () => false });
    expect(artwork.flagEnabled).toBe(false);
    expect(artwork.cueSummary).toBeNull();
    expect(dependencies.getCatalogue).not.toHaveBeenCalled();
    expect(dependencies.createDisplay).not.toHaveBeenCalled();
    expect(dependencies.selectPortrait).not.toHaveBeenCalled();
    expect(dependencies.report).toHaveBeenCalledWith(null, null);
  });

  it("updates matching when the device illustration preference changes", () => {
    const { preferences, selectPortrait } = setup();
    expect(selectPortrait).toHaveBeenLastCalledWith(
      null,
      "vault-1",
      {},
      true,
      "fantasy",
      [],
    );
    preferences.setEnabled(false);
    flushSync();
    expect(selectPortrait).toHaveBeenLastCalledWith(
      null,
      "vault-1",
      {},
      false,
      "fantasy",
      [],
    );
  });

  it("leaves the portrait empty when image resolution fails", async () => {
    const { artwork } = setup({
      selectPortrait: () => privatePortrait,
      resolveImage: vi.fn().mockRejectedValue(new Error("missing image")),
    });
    await Promise.resolve();
    expect(artwork.portrait).toBeNull();
  });
});
