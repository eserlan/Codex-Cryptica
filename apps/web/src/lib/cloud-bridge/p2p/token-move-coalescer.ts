const TOKEN_MOVE_PRECISION = 2;
const DEFAULT_THROTTLE_MS = 50;

const round = (value: number) => {
  const factor = 10 ** TOKEN_MOVE_PRECISION;
  return Math.round(value * factor) / factor;
};

/**
 * Coalesces high-frequency `requestTokenMove` calls into at most one outbound
 * `TOKEN_MOVE` per token per throttle window, with 2-decimal precision and
 * dedup against the last sent coordinates.
 */
export class TokenMoveCoalescer {
  private pending = new Map<
    string,
    { x: number; y: number; timeoutId: number }
  >();
  private lastSent = new Map<string, { x: number; y: number }>();

  constructor(
    private readonly send: (tokenId: string, x: number, y: number) => void,
    private readonly throttleMs: number = DEFAULT_THROTTLE_MS,
  ) {}

  request(tokenId: string, x: number, y: number): void {
    const rx = round(x);
    const ry = round(y);

    const existing = this.pending.get(tokenId);
    if (existing) {
      if (existing.x === rx && existing.y === ry) return;
      existing.x = rx;
      existing.y = ry;
      return;
    }

    const last = this.lastSent.get(tokenId);
    if (last?.x === rx && last?.y === ry) return;

    const timeoutId = window.setTimeout(() => {
      const latest = this.pending.get(tokenId);
      this.pending.delete(tokenId);
      if (!latest) return;
      const sent = this.lastSent.get(tokenId);
      if (sent?.x === latest.x && sent?.y === latest.y) return;
      this.send(tokenId, latest.x, latest.y);
      this.lastSent.set(tokenId, { x: latest.x, y: latest.y });
    }, this.throttleMs);

    this.pending.set(tokenId, { x: rx, y: ry, timeoutId });
  }

  clear(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
    }
    this.pending.clear();
    this.lastSent.clear();
  }
}
