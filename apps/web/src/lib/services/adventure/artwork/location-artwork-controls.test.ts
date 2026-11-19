import { describe, expect, it, vi } from "vitest";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";
import { LocationArtworkControls } from "./location-artwork-controls";

const asset = {
  id: "forest",
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["forest"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  review: { status: "approved" },
  variants: { display: { sha256: "a".repeat(64) } },
} as unknown as ArtworkAsset;
const session = {
  id: "s1",
  vaultId: "v1",
  revision: 2,
  currentPlaceId: "p1",
  places: [{ id: "p1", name: "Forest" }],
};

describe("location artwork controls", () => {
  it("saves an eligible catalogue choice using the current revision", async () => {
    const mutate = vi.fn(async () => ({
      ok: true as const,
      association: { version: 1 as const },
    }));
    const controls = new LocationArtworkControls({
      session: () => session,
      catalogue: () => [asset],
      theme: () => "fantasy",
      mutate,
    });
    expect(await controls.choose("forest")).toBe(true);
    expect(mutate).toHaveBeenCalledWith(
      { kind: "place", id: "p1" },
      {
        kind: "replace",
        choice: {
          kind: "catalogue",
          assetId: "forest",
          sha256: "a".repeat(64),
        },
      },
      { vaultId: "v1", sessionId: "s1", expectedRevision: 2 },
    );
  });
  it("does not save an ineligible, withdrawn, missing or canonical choice", async () => {
    const mutate = vi.fn();
    for (const candidate of [
      { ...asset, withdrawn: true },
      { ...asset, genres: ["horror"] as ArtworkAsset["genres"] },
    ]) {
      const controls = new LocationArtworkControls({
        session: () => session,
        catalogue: () => [candidate],
        theme: () => "fantasy",
        mutate,
      });
      expect(await controls.choose("forest")).toBe(false);
    }
    const linked = new LocationArtworkControls({
      session: () => ({
        ...session,
        places: [{ id: "p1", name: "Forest", sourceRecordId: "e1" }],
      }),
      catalogue: () => [asset],
      theme: () => "fantasy",
      mutate,
    });
    expect(await linked.choose("forest")).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });
  it("keeps the existing automatic picture and reports failed saves", async () => {
    const withArtwork = {
      ...session,
      artwork: {
        version: 1,
        associations: [
          {
            subject: { kind: "place", id: "p1" },
            association: {
              version: 1,
              automatic: {
                assetId: "forest",
                catalogueVersion: 1,
                assignedOnTurnId: "t1",
              },
            },
          },
        ],
      },
    };
    const mutate = vi.fn(async () => ({
      ok: false as const,
      reason: "save-failed",
    }));
    const controls = new LocationArtworkControls({
      session: () => withArtwork,
      catalogue: () => [asset],
      theme: () => "fantasy",
      mutate,
    });
    expect(await controls.keep("forest")).toBe(false);
    expect(mutate).toHaveBeenCalledWith(
      expect.anything(),
      {
        kind: "keep",
        choice: {
          kind: "catalogue",
          assetId: "forest",
          sha256: "a".repeat(64),
        },
      },
      expect.anything(),
    );
    expect(await controls.dismiss()).toBe(false);
    expect(await controls.restore()).toBe(false);
  });
  it("treats an already-kept catalogue image as kept without another write", async () => {
    const withChoice = {
      ...session,
      artwork: {
        version: 1,
        associations: [
          {
            subject: { kind: "place", id: "p1" },
            association: {
              version: 1,
              override: {
                kind: "catalogue",
                assetId: "forest",
                sha256: "a".repeat(64),
              },
            },
          },
        ],
      },
    };
    const mutate = vi.fn();
    const controls = new LocationArtworkControls({
      session: () => withChoice,
      catalogue: () => [asset],
      theme: () => "fantasy",
      mutate,
    });
    expect(await controls.keep("forest")).toBe(true);
    expect(mutate).not.toHaveBeenCalled();
  });
});
