import { describe, expect, it } from "vitest";
import { currentPlaceSelection } from "./current-place-selection";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";

const session = {
  vaultId: "v1",
  currentPlaceId: "p1",
  places: [{ id: "p1", name: "Forest", sourceRecordId: "e1" }],
};
const entity = { id: "e1", image: "images/forest.png" };
const asset = {
  id: "forest-art",
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["forest"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  withdrawn: false,
  review: { status: "approved" },
  alt: "A forest road",
  variants: { display: { sha256: "a".repeat(64) } },
  provenance: { attribution: "Artist" },
} as unknown as ArtworkAsset;

describe("current place selection", () => {
  it("selects the linked Vault image only within the active Vault", () => {
    expect(currentPlaceSelection(session, "v1", { e1: entity }, true)).toEqual({
      kind: "vault",
      image: "images/forest.png",
      subjectKey: "entity:e1",
      alt: "Illustration of Forest",
    });
    expect(
      currentPlaceSelection(session, "v2", { e1: entity }, true),
    ).toBeNull();
  });
  it("respects dismissal, disabled mode, and opaque future metadata", () => {
    expect(
      currentPlaceSelection(session, "v1", { e1: entity }, false),
    ).toBeNull();
    expect(
      currentPlaceSelection(
        session,
        "v1",
        {
          e1: {
            ...entity,
            adventureArtwork: { version: 1, override: { kind: "dismissed" } },
          },
        },
        true,
      ),
    ).toBeNull();
    expect(
      currentPlaceSelection(
        session,
        "v1",
        { e1: { ...entity, adventureArtwork: { version: 2 } } },
        true,
      ),
    ).toBeNull();
  });
  it("uses an explicit kept snapshot instead of the mutable Vault image", () => {
    const choice = {
      kind: "snapshot",
      path: "images/artwork_keep.png",
      mime: "image/png",
      bytes: 1,
      width: 1,
      height: 1,
      sha256: "a".repeat(64),
    };
    expect(
      currentPlaceSelection(
        session,
        "v1",
        {
          e1: { ...entity, adventureArtwork: { version: 1, override: choice } },
        },
        true,
      ),
    ).toEqual({
      kind: "snapshot",
      image: choice.path,
      subjectKey: "entity:e1",
      alt: "Illustration of Forest",
    });
  });
  it("never substitutes a Vault image for an unavailable explicit catalogue choice", () => {
    const choice = {
      kind: "catalogue",
      assetId: "missing",
      sha256: "a".repeat(64),
    };
    expect(
      currentPlaceSelection(
        session,
        "v1",
        {
          e1: { ...entity, adventureArtwork: { version: 1, override: choice } },
        },
        true,
      ),
    ).toBeNull();
  });

  it("selects a saved catalogue choice only when its exact approved image remains available", () => {
    const choice = {
      kind: "catalogue",
      assetId: "forest-art",
      sha256: "a".repeat(64),
    };
    const entities = {
      e1: { ...entity, adventureArtwork: { version: 1, override: choice } },
    };
    expect(
      currentPlaceSelection(session, "v1", entities, true, [asset]),
    ).toMatchObject({ kind: "catalogue", asset, alt: "A forest road" });
    expect(
      currentPlaceSelection(session, "v1", entities, true, [
        { ...asset, withdrawn: true },
      ]),
    ).toBeNull();
    expect(
      currentPlaceSelection(session, "v1", entities, true, [
        {
          ...asset,
          variants: {
            ...asset.variants,
            display: { ...asset.variants.display, sha256: "b".repeat(64) },
          },
        },
      ]),
    ).toBeNull();
  });
  it("reuses automatic catalogue art for a local place while Vault pictures retain precedence", () => {
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
                assetId: "forest-art",
                catalogueVersion: 1,
                assignedOnTurnId: "turn1",
              },
            },
          },
        ],
      },
    };
    expect(currentPlaceSelection(local, "v1", {}, true, [asset])).toMatchObject(
      { kind: "catalogue", asset },
    );
    const canonical = {
      ...entity,
      adventureArtwork: local.artwork.associations[0].association,
    };
    expect(
      currentPlaceSelection(session, "v1", { e1: canonical }, true, [asset]),
    ).toMatchObject({ kind: "vault", image: entity.image });

    const canonicalWithoutImage = {
      ...session,
      artwork: local.artwork,
    };
    expect(
      currentPlaceSelection(
        canonicalWithoutImage,
        "v1",
        { e1: { id: "e1" } },
        true,
        [asset],
      ),
    ).toMatchObject({ kind: "catalogue", asset, subjectKey: "entity:e1" });
    expect(
      currentPlaceSelection(canonicalWithoutImage, "v1", { e1: entity }, true, [
        asset,
      ]),
    ).toMatchObject({ kind: "vault", image: entity.image });
  });

  it("matches catalogue artwork from live place cues when no automatic assignment exists", () => {
    const cuedSession = {
      vaultId: "v1",
      currentPlaceId: "p1",
      places: [
        {
          id: "p1",
          name: "Kettleford",
          sourceRecordId: "e1",
          cues: ["forest"],
        },
      ],
    };
    expect(
      currentPlaceSelection(
        cuedSession,
        "v1",
        { e1: { id: "e1" } },
        true,
        [asset],
        "fantasy",
      ),
    ).toMatchObject({ kind: "catalogue", asset, subjectKey: "entity:e1" });
  });
});
