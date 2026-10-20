import type { Token } from "../../../types/vtt";
import { nextZIndexInLayer, type MapLayer } from "map-engine";
import type { IdGenerator } from "$lib/utils/runtime-deps";

/** Hydrate authored entity text while preserving independent token metadata. */
export function hydrateTokenRecords(
  tokens: Record<string, Token>,
  vault:
    | { entities?: Record<string, { title?: string; content?: string }> }
    | undefined,
) {
  const hydrated: Record<string, Token> = {};
  for (const id in tokens) {
    const token = tokens[id];
    const entity = token.entityId && vault?.entities?.[token.entityId];
    hydrated[id] = entity
      ? {
          ...token,
          name: entity.title || token.name,
          noteBody:
            token.kind === "note" && entity.content !== undefined
              ? entity.content
              : token.noteBody,
        }
      : token;
  }
  return hydrated;
}

function clonedTokenName(sourceName: string, tokens: Token[]) {
  const trimmed = sourceName.trim() || "Token";
  const baseName = trimmed.replace(/\s+#\d+$/, "");
  const pattern = new RegExp(
    `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s+#(\\d+))?$`,
  );
  let highest = 1;

  for (const token of tokens) {
    const match = token.name.trim().match(pattern);
    if (!match) continue;
    const suffix = match[1] ? Number(match[1]) : 1;
    if (suffix > highest) {
      highest = suffix;
    }
  }

  return `${baseName} #${highest + 1}`;
}

export function cloneTokenRecord(
  source: Token,
  tokens: Token[],
  gridSize: number,
  idGenerator: IdGenerator,
): Token {
  const offset = gridSize || 50;
  const sameLayer = tokens.filter((token) => token.layer === source.layer);
  return {
    ...source,
    id: idGenerator.uuid(),
    name: clonedTokenName(source.name, tokens),
    x: source.x + offset,
    y: source.y + offset,
    zIndex: nextZIndexInLayer(sameLayer),
  };
}

export function removeTokenRecord(
  tokens: Record<string, Token>,
  tokenId: string,
) {
  const next = { ...tokens };
  delete next[tokenId];
  for (const key in next) {
    if (next[key].parentTokenId === tokenId)
      next[key] = { ...next[key], parentTokenId: undefined };
  }
  return next;
}

export function childTokenNotes(
  tokens: Record<string, Token>,
  parentTokenId: string,
): Token[] {
  const result: Token[] = [];
  for (const key in tokens) {
    if (tokens[key].parentTokenId === parentTokenId) result.push(tokens[key]);
  }
  return result;
}

/** Ordering is scoped to the layer and ignores non-finite z indices. */
export function layerEdgeZIndex(
  tokens: Token[],
  layer: MapLayer | undefined,
  front: boolean,
) {
  let edge = front ? -1 : 0;
  const combine = front ? Math.max : Math.min;
  for (const token of tokens) {
    if (token.layer === layer && Number.isFinite(token.zIndex))
      edge = combine(edge, token.zIndex);
  }
  return edge + (front ? 1 : -1);
}
