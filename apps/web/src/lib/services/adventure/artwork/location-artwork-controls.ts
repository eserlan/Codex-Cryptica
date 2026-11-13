import {
  matchArtwork,
  type ArtworkAsset,
  type ArtworkCommand,
} from "@codex/adventure-artwork-engine";
import { readAdventureArtworkState } from "schema";
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
  // fallow-ignore-next-line complexity -- Adventure artwork orchestration; branches are validation and fallback guards covered by feature tests.
  async keep(id: string): Promise<boolean> {
    const current = this.current();
    if (!current) return false;
    const state = readAdventureArtworkState(current.session.artwork);
    const association =
      state.kind === "known"
        ? state.value.associations.find(
            (entry) =>
              entry.subject.kind === "place" &&
              entry.subject.id === current.place.id,
          )?.association
        : undefined;
    const asset = this.deps
      .catalogue()
      .find(
        (candidate) =>
          candidate.id === id &&
          candidate.type === "location" &&
          !candidate.withdrawn &&
          candidate.review.status === "approved",
      );
    if (
      asset &&
      association?.override?.kind === "catalogue" &&
      association.override.assetId === id &&
      association.override.sha256 === asset.variants.display.sha256
    )
      return true;
    if (association?.automatic?.assetId !== id || association.override)
      return false;
    return asset
      ? this.apply({
          kind: "keep",
          choice: {
            kind: "catalogue",
            assetId: asset.id,
            sha256: asset.variants.display.sha256,
          },
        })
      : false;
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
