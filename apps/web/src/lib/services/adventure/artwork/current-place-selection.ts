import {
  ArtworkAssociationSchema,
  artworkDataUnchanged,
  readAdventureArtworkState,
  type ArtworkAssociation,
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

function findCurrentPlace(
  session: ArtworkPlaceSession | null,
  activeVaultId: string | null | undefined,
  enabled: boolean,
): Place | null {
  if (!enabled || !session || session.vaultId !== activeVaultId) return null;
  return (
    session.places?.find((item) => item.id === session.currentPlaceId) ?? null
  );
}

function resolvePlaceEntity(
  place: Place,
  entities: Readonly<Record<string, ArtworkPlaceEntity>>,
): { ok: true; entity?: ArtworkPlaceEntity } | { ok: false } {
  if (!place.sourceRecordId) return { ok: true, entity: undefined };
  const entity = entities[place.sourceRecordId];
  if (!entity || entity.id !== place.sourceRecordId) return { ok: false };
  return { ok: true, entity };
}

function parsePlaceAssociation(
  session: ArtworkPlaceSession,
  placeId: string,
  entity: ArtworkPlaceEntity | undefined,
): { ok: true; association: ArtworkAssociation | undefined } | { ok: false } {
  const rawState = readRawAssociation(session, placeId, entity);
  if (!rawState.ok) return { ok: false };
  if (rawState.raw === undefined) return { ok: true, association: undefined };
  const parsed = ArtworkAssociationSchema.safeParse(rawState.raw);
  if (!parsed.success || !artworkDataUnchanged(parsed.data, rawState.raw)) {
    return { ok: false };
  }
  return { ok: true, association: parsed.data };
}

function toCatalogueResult(
  asset: ArtworkAsset | undefined,
  subjectKey: string,
): PlaceSelectionResult | null {
  return asset
    ? { kind: "catalogue", asset, subjectKey, alt: asset.alt }
    : null;
}

function resolveSnapshotResult(
  association: ArtworkAssociation | undefined,
  placeName: string,
  subjectKey: string,
): PlaceSelectionResult | null {
  const override = association?.override;
  if (override?.kind !== "snapshot") return null;
  return {
    kind: "snapshot",
    image: override.path,
    subjectKey,
    alt: `Illustration of ${placeName}`,
  };
}

function resolveImageResult(
  association: ArtworkAssociation | undefined,
  entity: ArtworkPlaceEntity | undefined,
  place: Place,
  subjectKey: string,
): PlaceSelectionResult | null {
  const snapshot = resolveSnapshotResult(association, place.name, subjectKey);
  if (snapshot) return snapshot;
  if (!entity?.image) return null;
  return {
    kind: "vault",
    image: entity.image,
    subjectKey,
    alt: `Illustration of ${place.name}`,
  };
}

function resolveFallbackSelection(
  association: ArtworkAssociation | undefined,
  entity: ArtworkPlaceEntity | undefined,
  place: Place,
  subjectKey: string,
  catalogue: readonly ArtworkAsset[],
): PlaceSelectionResult | null {
  const direct = resolveImageResult(association, entity, place, subjectKey);
  if (direct) return direct;
  if (!association?.automatic) return null;
  const asset = findEligibleLocationAsset(
    catalogue,
    association.automatic.assetId,
  );
  return toCatalogueResult(asset, subjectKey);
}

function resolveCatalogueOverride(
  override: ArtworkAssociation["override"],
  subjectKey: string,
  catalogue: readonly ArtworkAsset[],
): PlaceSelectionResult | null {
  if (override?.kind !== "catalogue") return null;
  return toCatalogueResult(
    findEligibleLocationAsset(catalogue, override.assetId, override.sha256),
    subjectKey,
  );
}

function resolveActiveArtwork(
  override: ArtworkAssociation["override"],
  association: ArtworkAssociation | undefined,
  entity: ArtworkPlaceEntity | undefined,
  place: Place,
  subjectKey: string,
  catalogue: readonly ArtworkAsset[],
): PlaceSelectionResult | null {
  if (override?.kind === "catalogue") {
    return resolveCatalogueOverride(override, subjectKey, catalogue);
  }
  return resolveFallbackSelection(
    association,
    entity,
    place,
    subjectKey,
    catalogue,
  );
}

function selectPlaceArtwork(
  association: ArtworkAssociation | undefined,
  entity: ArtworkPlaceEntity | undefined,
  place: Place,
  catalogue: readonly ArtworkAsset[],
): PlaceSelectionResult | null {
  const override = association?.override;
  if (override?.kind === "dismissed") return null;
  const subjectKey = entity ? `entity:${entity.id}` : `place:${place.id}`;
  return resolveActiveArtwork(
    override,
    association,
    entity,
    place,
    subjectKey,
    catalogue,
  );
}

/** Resolve saved selections; unknown artwork data fails closed. */
export function currentPlaceSelection(
  session: ArtworkPlaceSession | null,
  activeVaultId: string | null | undefined,
  entities: Readonly<Record<string, ArtworkPlaceEntity>>,
  enabled: boolean,
  catalogue: readonly ArtworkAsset[] = [],
): PlaceSelectionResult | null {
  const place = findCurrentPlace(session, activeVaultId, enabled);
  if (!place || !session) return null;
  const entityState = resolvePlaceEntity(place, entities);
  if (!entityState.ok) return null;
  const assocState = parsePlaceAssociation(
    session,
    place.id,
    entityState.entity,
  );
  if (!assocState.ok) return null;
  return selectPlaceArtwork(
    assocState.association,
    entityState.entity,
    place,
    catalogue,
  );
}
