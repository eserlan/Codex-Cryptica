import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { ArtworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
import AdventureCurrentArtwork from "./AdventureCurrentArtwork.svelte";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";

const session = {
  vaultId: "v1",
  currentPlaceId: "p1",
  places: [{ id: "p1", name: "Forest", sourceRecordId: "e1" }],
};
const entities = { e1: { id: "e1", image: "images/forest.png" } };

describe("current adventure artwork", () => {
  it("renders a saved catalogue assignment through the validated display service", async () => {
    const asset = {
      id: "forest-art",
      type: "location",
      review: { status: "approved" },
      alt: "A forest road",
      variants: { display: { sha256: "a".repeat(64) } },
      provenance: { attribution: "Artist" },
    } as unknown as ArtworkAsset;
    const local = {
      ...session,
      places: [{ id: "p1", name: "Forest" }],
      artwork: {
        version: 1,
        associations: [
          {
            subject: { kind: "place", id: "p1" },
            association: {
              version: 1,
              automatic: {
                assetId: asset.id,
                catalogueVersion: 1,
                assignedOnTurnId: "turn1",
              },
            },
          },
        ],
      },
    };
    const load = vi.fn(async () => ({
      url: "blob:catalogue",
      release: vi.fn(),
    }));
    render(AdventureCurrentArtwork, {
      props: {
        session: local,
        entities: {},
        activeVaultId: "v1",
        preferences: new ArtworkPreferences(null),
        resolve: vi.fn(),
        catalogue: [asset],
        display: { load },
      },
    });
    expect(
      (await screen.findByAltText("A forest road")).getAttribute("src"),
    ).toBe("blob:catalogue");
    expect(screen.getByText(/AI illustration/).textContent).toContain("Artist");
    expect(load).toHaveBeenCalledOnce();
  });
  it("shows the current linked Vault image and hides it when disabled", async () => {
    const preferences = new ArtworkPreferences(null);
    const resolve = vi.fn(async () => "blob:forest");
    render(AdventureCurrentArtwork, {
      props: { session, entities, activeVaultId: "v1", preferences, resolve },
    });
    expect(
      (await screen.findByAltText("Illustration of Forest")).getAttribute(
        "src",
      ),
    ).toBe("blob:forest");
    expect(screen.getByText("Vault image")).toBeTruthy();
    preferences.setEnabled(false);
    await waitFor(() =>
      expect(screen.queryByAltText("Illustration of Forest")).toBeNull(),
    );
  });
  it("makes no image request for a different active Vault", async () => {
    const resolve = vi.fn();
    render(AdventureCurrentArtwork, {
      props: {
        session,
        entities,
        activeVaultId: "v2",
        preferences: new ArtworkPreferences(null),
        resolve,
      },
    });
    await Promise.resolve();
    expect(resolve).not.toHaveBeenCalled();
  });
});
