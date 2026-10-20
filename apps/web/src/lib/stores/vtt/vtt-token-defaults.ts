import type {
  Token,
  TokenBaseShape,
  TokenCreationInput,
} from "../../../types/vtt";
import type { MapLayer } from "map-engine";
import { normalizeTokenVisibility } from "map-engine";
import { hashToColor } from "$lib/utils/vtt-helpers";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
import { NOTE_DEFAULT_COLOR, noteDefaults } from "./vtt-token-notes";

function defaultShape(kind: Token["kind"], gridType: string): TokenBaseShape {
  if (kind === "note") return "square";
  if (kind !== "tile") return "circle";
  if (gridType === "hex-flat" || gridType === "hex-pointy") return gridType;
  return "square";
}

function appearanceDefaults(input: TokenCreationInput, gridType: string) {
  const isNote = input.kind === "note";
  return {
    baseShape: input.baseShape ?? defaultShape(input.kind, gridType),
    facingIndicator: input.facingIndicator ?? !isNote,
    color:
      input.color || (isNote ? NOTE_DEFAULT_COLOR : hashToColor(input.name)),
    imageUrl: input.imageUrl ?? null,
  };
}

function ownershipDefaults(input: TokenCreationInput) {
  return {
    ownerPeerId: input.ownerPeerId ?? null,
    ownerGuestName: input.ownerGuestName ?? null,
    visibleTo: normalizeTokenVisibility(
      input.visibleTo ?? (input.kind === "note" ? "gm-only" : "all"),
    ),
  };
}

function sizeDefaults(input: TokenCreationInput, gridSize: number) {
  if (input.kind === "note") return noteDefaults(input, gridSize);
  // Fine grids should not make new character tokens invisible.
  const size = Math.max(30, gridSize || 50);
  return {
    width: input.width ?? size,
    height: input.height ?? size,
    noteBody: undefined,
    noteCollapsedFrom: undefined,
  };
}

/** Constructs token records without modifying the session. */
export class VTTTokenDefaults {
  constructor(
    private deps: { getMapStore: () => any; getActiveLayer: () => MapLayer },
    private getTokenCount: () => number,
    private idGenerator: IdGenerator = systemIdGenerator,
  ) {}

  getTokenDefaults(input: TokenCreationInput): Token {
    const mapStore = this.deps.getMapStore();
    return {
      id: this.idGenerator.uuid(),
      entityId: input.entityId ?? null,
      name: input.name.trim(),
      x: input.x,
      y: input.y,
      ...sizeDefaults(input, mapStore.gridSize),
      rotation: input.rotation ?? 0,
      ...appearanceDefaults(input, mapStore.gridType),
      zIndex: input.zIndex ?? this.getTokenCount(),
      ...ownershipDefaults(input),
      statusEffects: [],
      locked: input.locked === true,
      isVisionSource: input.isVisionSource === true,
      kind: input.kind ?? "token",
      tileDeckId: input.tileDeckId ?? null,
      tileDetails: input.tileDetails,
      layer: input.layer ?? this.deps.getActiveLayer(),
    };
  }
}
