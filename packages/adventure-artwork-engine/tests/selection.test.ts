import { describe, expect, it } from "vitest";
import { resolveArtwork, resolveSceneWithAtmosphere } from "../src/selection";
describe("artwork precedence", () => {
  it("uses dismissal before every source", () =>
    expect(
      resolveArtwork({
        enabled: true,
        association: { version: 1, override: { kind: "dismissed" } },
        vaultImage: "image",
        match: "forest",
      }),
    ).toEqual({ kind: "none" }));
  it("does not fall back from an unavailable explicit choice", () =>
    expect(
      resolveArtwork({
        enabled: true,
        association: {
          version: 1,
          override: {
            kind: "catalogue",
            assetId: "missing",
            sha256: "a".repeat(64),
          },
        },
        vaultImage: "image",
        match: "forest",
        availableAssetIds: [],
      }),
    ).toEqual({ kind: "none" }));
  it("prefers Vault art over automatic selection", () =>
    expect(
      resolveArtwork({ enabled: true, vaultImage: "image", match: "forest" }),
    ).toEqual({ kind: "vault", image: "image" }));
});

it("requires the exact kept digest and never substitutes a changed catalogue image", () => {
  const association = {
    version: 1 as const,
    override: {
      kind: "catalogue" as const,
      assetId: "forest",
      sha256: "a".repeat(64),
    },
  };
  expect(
    resolveArtwork({
      enabled: true,
      association,
      availableAssets: [{ id: "forest", sha256: "b".repeat(64) }],
      vaultImage: "other",
    }),
  ).toEqual({ kind: "none" });
  expect(
    resolveArtwork({
      enabled: true,
      association,
      availableAssets: [{ id: "forest", sha256: "a".repeat(64) }],
    }),
  ).toEqual({ kind: "catalogue", assetId: "forest", sha256: "a".repeat(64) });
});

it("does not substitute a Vault picture for an unavailable kept snapshot", () => {
  const association = {
    version: 1 as const,
    override: {
      kind: "snapshot" as const,
      path: "images/artwork_one.png",
      mime: "image/png" as const,
      bytes: 1,
      width: 1,
      height: 1,
      sha256: "a".repeat(64),
    },
  };
  expect(
    resolveArtwork({
      enabled: true,
      association,
      snapshotAvailable: false,
      vaultImage: "other",
    }),
  ).toEqual({ kind: "none" });
});

it("uses atmosphere fallback only for an explicitly identified committed scene before location fallback", () => {
  expect(
    resolveSceneWithAtmosphere({
      hasExplicitCommittedScene: true,
      sceneSelection: { kind: "none" },
      atmosphereMatch: "storm-atmo",
      locationSelection: { kind: "catalogue", assetId: "harbour" },
    }),
  ).toEqual({ kind: "catalogue", assetId: "storm-atmo" });

  expect(
    resolveSceneWithAtmosphere({
      hasExplicitCommittedScene: false,
      sceneSelection: { kind: "none" },
      atmosphereMatch: "storm-atmo",
      locationSelection: { kind: "catalogue", assetId: "harbour" },
    }),
  ).toEqual({ kind: "catalogue", assetId: "harbour" });
});
