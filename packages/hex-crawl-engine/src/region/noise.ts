import type { HexCoord } from "../model";

export type NoiseChannel = "height" | "wetness";
const CHANNEL_INDEX: Record<NoiseChannel, number> = { height: 0, wetness: 1 };

/** Integer lattice hash to [0, 1). Integer maths only, so it is identical on every device. */
function lattice(
  seedHash: number,
  x: number,
  y: number,
  channel: number,
): number {
  let h =
    seedHash ^
    Math.imul(x, 0x27d4eb2d) ^
    Math.imul(y, 0x165667b1) ^
    Math.imul(channel + 1, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Bilinear blend of lattice values, smoothed, at a point measured in lattice cells. */
function valueNoise(
  seedHash: number,
  fx: number,
  fy: number,
  channel: number,
): number {
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const a = lattice(seedHash, x0, y0, channel);
  const b = lattice(seedHash, x0 + 1, y0, channel);
  const c = lattice(seedHash, x0, y0 + 1, channel);
  const d = lattice(seedHash, x0 + 1, y0 + 1, channel);
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

const ROW_HEIGHT = 0.8660254037844386; // sqrt(3) / 2, written out so no maths library is involved

/**
 * Smooth seeded noise in [0, 1] for one hex. It depends only on the seed, the
 * hex and the channel, never on which other hexes are being generated, which
 * is what lets a landscape grow in several passes without contradicting itself.
 */
export function hexNoise(
  seedHash: number,
  hex: HexCoord,
  channel: NoiseChannel,
): number {
  const u = hex.q + hex.r / 2;
  const v = hex.r * ROW_HEIGHT;
  const ch = CHANNEL_INDEX[channel];
  const broad = valueNoise(seedHash, u / 5, v / 5, ch);
  const fine = valueNoise(seedHash, u / 2.5 + 31.7, v / 2.5 - 17.3, ch + 8);
  const mixed = broad * 0.65 + fine * 0.35;
  // Value noise hugs the middle; stretch it so every terrain gets a share.
  return Math.min(1, Math.max(0, (mixed - 0.5) * 1.7 + 0.5));
}
