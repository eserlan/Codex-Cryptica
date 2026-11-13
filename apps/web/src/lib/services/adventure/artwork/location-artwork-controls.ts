import {
  matchArtwork,
  type ArtworkAsset,
  type ArtworkCommand,
} from "@codex/adventure-artwork-engine";
import { readAdventureArtworkState, type ArtworkAssociation } from "schema";
import { describeVisiblePlace } from "./artwork-resolver";
import type {
  ArtworkControlContext,
  ArtworkMutationResult,
  ArtworkSubject,
} from "./ports";

type Session = {
  id: string;
  vaultId: string;
  revision: number;
  currentPlaceId?: string;
  places?: readonly { id: string; name: string; sourceRecordId?: string }[];
  artwork?: unknown;
};
interface Dependencies {
  session(): Session | null;
  catalogue(): readonly ArtworkAsset[];
  theme(): string | undefined;
  mutate(
    subject: ArtworkSubject,
    command: ArtworkCommand,
    context: ArtworkControlContext,
  ): Promise<ArtworkMutationResult>;
}

function findPlaceAssociation(
  artwork: unknown,
  placeId: string,
): ArtworkAssociation | undefined {
  const state = readAdventureArtworkState(artwork);
  if (state.kind !== "known") return undefined;
  return state.value.associations.find(
    (entry) => entry.subject.kind === "place" && entry.subject.id === placeId,
  )?.association;
}

function isApprovedLocationAsset(candidate: ArtworkAsset, id: string): boolean {
  return (
    candidate.id === id &&
    candidate.type === "location" &&
    !candidate.withdrawn &&
    candidate.review.status === "approved"
  );
}

function isAlreadyKept(
  association: ArtworkAssociation | undefined,
  asset: ArtworkAsset,
): boolean {
  const override = association?.override;
  return (
    override?.kind === "catalogue" &&
    override.assetId === asset.id &&
    override.sha256 === asset.variants.display.sha256
  );
}

function canKeepAutomatic(
  association: ArtworkAssociation | undefined,
  id: string,
): boolean {
  return association?.automatic?.assetId === id && !association.override;
}

/** Commands for provisional locations; canonical choices need the Vault adapter. */
export class LocationArtworkControls {
  constructor(private readonly deps: Dependencies) {}
  private current() {
    const session = this.deps.session();
    const place = session?.places?.find(
      (item) => item.id === session.currentPlaceId,
    );
    if (!session || !place || place.sourceRecordId) return null;
    return {
      session,
      place,
      cues: describeVisiblePlace(place, this.deps.theme()),
    };
  }
  options(): readonly ArtworkAsset[] {
    const current = this.current();
    if (!current?.cues) return [];
    const cues = current.cues;
    return this.deps
      .catalogue()
      .filter((asset) => matchArtwork([asset], cues) !== null);
  }
  async choose(id: string): Promise<boolean> {
    const asset = this.options().find((candidate) => candidate.id === id);
    return asset
      ? this.apply({
          kind: "replace",
          choice: {
            kind: "catalogue",
            assetId: asset.id,
            sha256: asset.variants.display.sha256,
          },
        })
      : false;
  }
  async keep(id: string): Promise<boolean> {
    const current = this.current();
    if (!current) return false;
    const asset = this.deps
      .catalogue()
      .find((candidate) => isApprovedLocationAsset(candidate, id));
    if (!asset) return false;
    const association = findPlaceAssociation(
      current.session.artwork,
      current.place.id,
    );
    if (isAlreadyKept(association, asset)) return true;
    if (!canKeepAutomatic(association, id)) return false;
    return this.apply({
      kind: "keep",
      choice: {
        kind: "catalogue",
        assetId: asset.id,
        sha256: asset.variants.display.sha256,
      },
    });
  }
  dismiss() {
    return this.apply({ kind: "dismiss" });
  }
  restore() {
    return this.apply({ kind: "restore" });
  }
  private async apply(command: ArtworkCommand): Promise<boolean> {
    const current = this.current();
    if (!current) return false;
    try {
      const { session, place } = current;
      const result = await this.deps.mutate(
        { kind: "place", id: place.id },
        command,
        {
          vaultId: session.vaultId,
          sessionId: session.id,
          expectedRevision: session.revision,
        },
      );
      return result.ok;
    } catch {
      return false;
    }
  }
}
