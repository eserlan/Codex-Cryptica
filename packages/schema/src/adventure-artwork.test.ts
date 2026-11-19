import { describe, expect, it } from "vitest";
import {
  ArtworkAssociationSchema,
  AdventureArtworkStateSchema,
} from "./adventure-artwork";

const hash = "a".repeat(64);
const snapshot = {
  kind: "snapshot",
  path: "images/artwork_abc.png",
  mime: "image/png",
  bytes: 50,
  width: 2,
  height: 3,
  sha256: hash,
};

describe("artwork persistence", () => {
  it("accepts automatic and explicit choices", () => {
    expect(
      ArtworkAssociationSchema.safeParse({
        version: 1,
        automatic: {
          assetId: "woodland",
          catalogueVersion: 1,
          assignedOnTurnId: "turn-1",
        },
        override: snapshot,
      }).success,
    ).toBe(true);
    expect(
      ArtworkAssociationSchema.safeParse({
        version: 1,
        override: { kind: "dismissed" },
      }).success,
    ).toBe(true);
    expect(
      ArtworkAssociationSchema.safeParse({
        version: 1,
        override: { kind: "catalogue", assetId: "woodland", sha256: hash },
      }).success,
    ).toBe(true);
  });
  it("rejects unsafe paths, malformed snapshots and unsupported versions", () => {
    for (const path of [
      "images/../secret.png",
      "https://example.org/a.png",
      "images/original.png",
    ]) {
      expect(
        ArtworkAssociationSchema.safeParse({
          version: 1,
          override: { ...snapshot, path },
        }).success,
      ).toBe(false);
    }
    expect(
      ArtworkAssociationSchema.safeParse({
        version: 1,
        override: { ...snapshot, bytes: 0 },
      }).success,
    ).toBe(false);
    expect(ArtworkAssociationSchema.safeParse({ version: 2 }).success).toBe(
      false,
    );
  });
  it("rejects duplicate subject keys and more than 200 associations", () => {
    const entry = {
      subject: { kind: "place", id: "p1" },
      association: { version: 1 },
    };
    expect(
      AdventureArtworkStateSchema.safeParse({
        version: 1,
        associations: [entry],
      }).success,
    ).toBe(true);
    expect(
      AdventureArtworkStateSchema.safeParse({
        version: 1,
        associations: [entry, entry],
      }).success,
    ).toBe(false);
    expect(
      AdventureArtworkStateSchema.safeParse({
        version: 1,
        associations: Array.from({ length: 201 }, (_, i) => ({
          ...entry,
          subject: { kind: "place", id: `p${i}` },
        })),
      }).success,
    ).toBe(false);
  });
});

describe("artwork recovery", () => {
  it("distinguishes known valid data from opaque future and malformed data without changing it", async () => {
    const { readAdventureArtworkState } = await import("./adventure-artwork");
    const known = { version: 1, associations: [] };
    expect(readAdventureArtworkState(known)).toEqual({
      kind: "known",
      value: known,
    });
    const future = { version: 2, associations: [{ future: true }] };
    const recovered = readAdventureArtworkState(future);
    expect(recovered).toEqual({ kind: "opaque", raw: future });
    expect(
      readAdventureArtworkState({ version: 1, associations: "bad" }).kind,
    ).toBe("opaque");
    expect(readAdventureArtworkState(undefined)).toEqual({ kind: "absent" });
  });
});

describe("entity artwork recovery", () => {
  it("preserves an unsupported artwork version when an entity is edited", async () => {
    const { EntitySchema } = await import("./entity");
    const artwork = { version: 2, extra: { future: true } };
    const entity = EntitySchema.parse({
      id: "entity-1",
      type: "location",
      title: "Harbour",
      adventureArtwork: artwork,
    });
    expect(
      EntitySchema.parse({ ...entity, title: "New harbour" }).adventureArtwork,
    ).toEqual(artwork);
  });
});
