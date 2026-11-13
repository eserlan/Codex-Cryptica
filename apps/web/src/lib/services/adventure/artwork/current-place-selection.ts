import {
  ArtworkAssociationSchema,
  artworkDataUnchanged,
  readAdventureArtworkState,
} from "schema";
import type { ArtworkAsset } from "@codex/adventure-artwork-engine";

type Place = { id: string; name: string; sourceRecordId?: string };
export type ArtworkPlaceSession = {
  vaultId: string;
  currentPlaceId?: string;
  places?: readonly Place[];
  artwork?: unknown;
};
export type ArtworkPlaceEntity = {
  id: string;
  image?: string;
  adventureArtwork?: unknown;
};

type PlaceSelectionResult =
  | {
      kind: "vault" | "snapshot";
      image: string;
      subjectKey: string;
      alt: string;
    }
  | {
      kind: "catalogue";
      asset: ArtworkAsset;
      subjectKey: string;
      alt: string;
    };

function readRawAssociation(
  session: ArtworkPlaceSession,
  placeId: string,
  entity: ArtworkPlaceEntity | undefined,
): { ok: true; raw: unknown } | { ok: false } {
  if (entity) return { ok: true, raw: entity.adventureArtwork };
  const state = readAdventureArtworkState(session.artwork);
  if (state.kind === "opaque") return { ok: false };
  const raw =
    state.kind === "known"
      ? state.value.associations.find(
          (entry) =>
            entry.subject.kind === "place" && entry.subject.id === placeId,
        )?.association
      : undefined;
  return { ok: true, raw };
}

function findEligibleLocationAsset(
  catalogue: readonly ArtworkAsset[],
  id: string,
  hash?: string,
): ArtworkAsset | undefined {
  return catalogue.find(
    (asset) =>
      asset.id === id &&
      asset.type === "location" &&
      !asset.withdrawn &&
      asset.review.status === "approved" &&
      (!hash || asset.variants.display.sha256 === hash),
  );
}

/** Resolve saved selections; unknown artwork data fails closed. */
// fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
export function currentPlaceSelection(
  session: ArtworkPlaceSession | null,
  activeVaultId: string | null | undefined,
  entities: Readonly<Record<string, ArtworkPlaceEntity>>,
  enabled: boolean,
  catalogue: readonly ArtworkAsset[] = [],
): PlaceSelectionResult | null {
  if (!enabled || !session || session.vaultId !== activeVaultId) return null;
  const place = session.places?.find(
    (item) => item.id === session.currentPlaceId,
  );
  if (!place) return null;
  const entity = place.sourceRecordId
    ? entities[place.sourceRecordId]
    : undefined;
  if (place.sourceRecordId && (!entity || entity.id !== place.sourceRecordId))
    return null;
  const rawState = readRawAssociation(session, place.id, entity);
  if (!rawState.ok) return null;
  const parsed =
    rawState.raw === undefined
      ? null
      : ArtworkAssociationSchema.safeParse(rawState.raw);
  if (
    parsed &&
    (!parsed.success || !artworkDataUnchanged(parsed.data, rawState.raw))
  )
    return null;
  const association = parsed?.success ? parsed.data : undefined;
  const override = association?.override;
  if (override?.kind === "dismissed") return null;
  const subjectKey = entity ? `entity:${entity.id}` : `place:${place.id}`;
  if (override?.kind === "catalogue") {
    const asset = findEligibleLocationAsset(
      catalogue,
      override.assetId,
      override.sha256,
    );
    return asset
      ? { kind: "catalogue", asset, subjectKey, alt: asset.alt }
      : null;
  }
  const kind = override?.kind === "snapshot" ? "snapshot" : "vault";
  const image = override?.kind === "snapshot" ? override.path : entity?.image;
  if (!image) {
    const asset = association?.automatic
      ? findEligibleLocationAsset(catalogue, association.automatic.assetId)
      : undefined;
    return asset
      ? { kind: "catalogue", asset, subjectKey, alt: asset.alt }
      : null;
  }
  return {
    kind,
    image,
    subjectKey,
    alt: `Illustration of ${place.name}`,
  };
}
