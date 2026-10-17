import {
  buildHexJourneyRoute,
  estimateHexJourney,
  type HexJourneyEstimate,
  type HexJourneyRoute,
} from "hex-crawl-engine";
import type { HexCoord } from "map-engine";

export interface HexJourneyIdentity {
  mapId: string;
  vaultId: string;
  gridDistance: number;
  gridUnit: string;
  gridSignature: string;
}

export interface HexJourneyToken {
  id: string;
  label?: string;
  hex: HexCoord;
}
export type HexJourneyPhase =
  "preview" | "ready" | "stepping" | "blocked" | "arrived";
export interface HexJourneyStoreDeps {
  getIdentity: () => HexJourneyIdentity | null;
  isAllowed: () => boolean;
  listEligibleTokens: () => HexJourneyToken[];
  onStart: (
    route: HexJourneyRoute,
    tokenId: string,
  ) => Promise<boolean> | boolean;
  onStep: (
    route: HexJourneyRoute,
    from: HexCoord,
    to: HexCoord,
    tokenId: string,
  ) =>
    | Promise<
        boolean | { moved: boolean; arrivalSaved?: boolean; error?: string }
      >
    | boolean
    | { moved: boolean; arrivalSaved?: boolean; error?: string };
  onRetryArrival?: (mapId: string, hex: HexCoord) => Promise<boolean>;
}

/** Transient journey UI state. It deliberately has no persistence dependency. */
export class HexJourneyStore {
  route = $state<HexJourneyRoute | null>(null);
  phase = $state<HexJourneyPhase | null>(null);
  selectedTokenId = $state<string | null>(null);
  hoursPerHex = $state<number | null>(null);
  committedSteps = $state(0);
  error = $state<string | null>(null);
  pendingArrival = $state<HexCoord | null>(null);
  busy = $state(false);
  private origin = $state<HexCoord | null>(null);
  private identity: HexJourneyIdentity | null = null;
  private operation = 0;
  private movementHandler: HexJourneyStoreDeps["onStep"];
  private retryArrivalHandler: HexJourneyStoreDeps["onRetryArrival"];

  constructor(private readonly deps: HexJourneyStoreDeps) {
    this.movementHandler = deps.onStep;
    this.retryArrivalHandler = deps.onRetryArrival;
  }

  setMovementHandler(handler: HexJourneyStoreDeps["onStep"]): void {
    this.movementHandler = handler;
  }
  setRetryArrivalHandler(
    handler: NonNullable<HexJourneyStoreDeps["onRetryArrival"]>,
  ): void {
    this.retryArrivalHandler = handler;
  }

  setOrigin(hex: HexCoord): void {
    this.origin = { ...hex };
  }
  get selectedOrigin(): HexCoord | null {
    return this.origin ? { ...this.origin } : null;
  }
  get eligibleTokens(): readonly HexJourneyToken[] {
    return this.deps.listEligibleTokens();
  }
  get canStart(): boolean {
    if (
      !this.route ||
      this.route.steps === 0 ||
      this.busy ||
      !this.deps.isAllowed()
    )
      return false;
    const token = this.deps
      .listEligibleTokens()
      .find((candidate) => candidate.id === this.selectedTokenId);
    return Boolean(token && sameHex(token.hex, this.route.origin));
  }
  get canRetryArrival(): boolean {
    const current = this.deps.getIdentity();
    return Boolean(
      this.pendingArrival &&
      this.identity &&
      current &&
      this.identity.mapId === current.mapId &&
      this.identity.vaultId === current.vaultId &&
      this.identity.gridSignature === current.gridSignature &&
      this.identity.gridDistance === current.gridDistance &&
      this.identity.gridUnit === current.gridUnit &&
      this.deps.isAllowed(),
    );
  }
  get startBlockedReason(): string | null {
    if (!this.route || this.busy) return null;
    if (this.route.steps === 0) return "This journey has no moves.";
    const token = this.deps
      .listEligibleTokens()
      .find((candidate) => candidate.id === this.selectedTokenId);
    if (!token) return "Choose a movable party token to start this journey.";
    if (!sameHex(token.hex, this.route.origin))
      return "Move the chosen party token to the journey start, or plan again.";
    return null;
  }
  get estimate(): (HexJourneyEstimate & { ok: true }) | null {
    if (!this.route) return null;
    const value = estimateHexJourney({
      totalSteps: this.route.steps,
      completedSteps: this.committedSteps,
      gridDistance: this.route.gridDistance,
      gridUnit: this.route.gridUnit,
      hoursPerHex: this.hoursPerHex,
    });
    return value.ok ? value : null;
  }

  // fallow-ignore-next-line complexity -- Preview validates permissions, identity, origin, and route bounds before committing preview state.
  preview(
    destination: HexCoord,
  ): { ok: true; steps: number } | { ok: false; reason: string } {
    if (this.busy)
      return {
        ok: false,
        reason: "Wait for the current journey action to finish.",
      };
    if (this.pendingArrival)
      return {
        ok: false,
        reason:
          "Retry the pending arrival save before planning another journey.",
      };
    if (!this.deps.isAllowed())
      return this.rejectPreview("Journey controls are unavailable.");
    const identity = this.deps.getIdentity();
    if (!identity) return this.rejectPreview("There is no active hex map.");
    const tokens = this.deps.listEligibleTokens();
    const token = this.selectedTokenId
      ? tokens.find((candidate) => candidate.id === this.selectedTokenId)
      : tokens.length === 1
        ? tokens[0]
        : undefined;
    const origin = this.origin ?? token?.hex;
    if (!origin)
      return this.rejectPreview("Choose a journey start or party token first.");
    const route = buildHexJourneyRoute(
      origin,
      destination,
      identity.gridDistance,
      identity.gridUnit,
    );
    if (!route.ok) {
      const message =
        route.reason === "route-too-long"
          ? "Choose a nearer destination. Journeys can be up to 1,000 hexes long."
          : "The route cannot be measured with this map's grid settings.";
      return this.rejectPreview(message);
    }
    this.operation++;
    this.identity = { ...identity };
    this.route = route;
    this.phase = "preview";
    this.selectedTokenId = token?.id ?? this.selectedTokenId;
    this.committedSteps = 0;
    this.hoursPerHex = null;
    this.error = null;
    return { ok: true, steps: route.steps };
  }

  selectToken(id: string): boolean {
    if (!this.deps.listEligibleTokens().some((token) => token.id === id))
      return false;
    this.selectedTokenId = id;
    return true;
  }
  setHoursPerHex(value: number | null): boolean {
    if (value !== null && (!Number.isFinite(value) || value <= 0)) return false;
    this.hoursPerHex = value;
    return true;
  }
  private rejectPreview(reason: string): { ok: false; reason: string } {
    this.route = null;
    this.phase = null;
    this.error = reason;
    return { ok: false, reason };
  }
  // fallow-ignore-next-line complexity -- This is the route identity comparison and invalidation boundary for all route-bound state.
  validateIdentity(): boolean {
    const current = this.deps.getIdentity();
    const valid = Boolean(
      this.identity &&
      current &&
      this.identity.mapId === current.mapId &&
      this.identity.vaultId === current.vaultId &&
      this.identity.gridSignature === current.gridSignature &&
      this.identity.gridDistance === current.gridDistance &&
      this.identity.gridUnit === current.gridUnit &&
      this.deps.isAllowed(),
    );
    if (!valid && this.busy) return false;
    if (!valid && this.route && this.pendingArrival) {
      this.operation++;
      this.route = null;
      this.phase = null;
      this.selectedTokenId = null;
      this.origin = null;
      this.committedSteps = 0;
      this.hoursPerHex = null;
      this.error =
        "Return to the original map to retry the pending arrival save.";
      this.busy = false;
    } else if (!valid && this.route) {
      this.clear();
    }
    return valid;
  }
  // fallow-ignore-next-line complexity -- Start handles one async transition with cancellation-safe state ownership.
  async start(): Promise<boolean> {
    if (
      !this.route ||
      this.phase !== "preview" ||
      this.busy ||
      this.route.steps === 0 ||
      !this.validateIdentity()
    )
      return false;
    const token = this.deps
      .listEligibleTokens()
      .find((candidate) => candidate.id === this.selectedTokenId);
    if (!token || !sameHex(token.hex, this.route.origin)) {
      this.error = "Choose a party token at the journey start.";
      return false;
    }
    const operation = ++this.operation;
    this.busy = true;
    try {
      const ok = await this.deps.onStart(this.route, token.id);
      if (operation !== this.operation) return false;
      if (!ok) {
        this.error =
          "The journey could not start. Check the token and permissions.";
        return false;
      }
      this.phase = "ready";
      return true;
    } catch {
      if (operation === this.operation) {
        this.error =
          "The journey could not start. Check the token and permissions.";
      }
      return false;
    } finally {
      if (operation === this.operation) this.busy = false;
    }
  }
  // fallow-ignore-next-line complexity -- Step commits movement, progress, arrival persistence, and recovery state as one guarded transaction.
  async step(): Promise<boolean> {
    if (
      this.busy ||
      !this.route ||
      this.phase !== "ready" ||
      !this.validateIdentity()
    )
      return false;
    const tokenId = this.selectedTokenId;
    if (!tokenId || this.committedSteps >= this.route.steps) return false;
    const from = this.route.hexes[this.committedSteps]!;
    const to = this.route.hexes[this.committedSteps + 1]!;
    this.phase = "stepping";
    const operation = ++this.operation;
    this.busy = true;
    try {
      const result = await this.movementHandler(this.route, from, to, tokenId);
      if (operation !== this.operation) return false;
      const moved = typeof result === "boolean" ? result : result.moved;
      if (!moved) {
        this.phase = "blocked";
        this.error =
          typeof result === "boolean"
            ? "Movement did not reach the next hex."
            : (result.error ?? "Movement did not reach the next hex.");
        return false;
      }
      this.committedSteps++;
      const saved =
        typeof result === "boolean" || result.arrivalSaved !== false;
      this.pendingArrival = saved ? null : { ...to };
      this.phase = saved
        ? this.committedSteps === this.route.steps
          ? "arrived"
          : "ready"
        : "blocked";
      this.error = saved
        ? null
        : typeof result === "boolean"
          ? "Arrival save failed."
          : (result.error ?? "Arrival save failed.");
      return saved;
    } catch {
      if (operation === this.operation) {
        this.phase = "blocked";
        this.error = "The journey step could not be completed.";
      }
      return false;
    } finally {
      if (operation === this.operation) this.busy = false;
    }
  }
  dismissPreview(): void {
    if (this.phase === "preview") this.clear();
  }
  // fallow-ignore-next-line complexity -- Retry owns the pending-arrival transaction and restores phase from route progress.
  async retryArrival(): Promise<boolean> {
    const pending = this.pendingArrival;
    const mapId = this.identity?.mapId;
    if (
      !pending ||
      this.busy ||
      !mapId ||
      !this.retryArrivalHandler ||
      !this.validateIdentity()
    )
      return false;
    const operation = ++this.operation;
    this.busy = true;
    try {
      if (!(await this.retryArrivalHandler(mapId, pending))) return false;
      if (operation !== this.operation) return false;
      this.pendingArrival = null;
      this.error = null;
      if (!this.route) {
        this.phase = null;
        this.identity = null;
      } else {
        this.phase =
          this.committedSteps === this.route.steps ? "arrived" : "ready";
      }
      return true;
    } catch {
      return false;
    } finally {
      if (operation === this.operation) this.busy = false;
    }
  }
  stop(): void {
    if (this.pendingArrival) {
      this.operation++;
      this.route = null;
      this.phase = null;
      this.selectedTokenId = null;
      this.origin = null;
      this.committedSteps = 0;
      this.hoursPerHex = null;
      this.busy = false;
      this.error =
        "Journey stopped. Retry the pending arrival save to finish this hex.";
      return;
    }
    this.clear();
  }
  clear(): void {
    this.operation++;
    this.route = null;
    this.phase = null;
    this.selectedTokenId = null;
    this.origin = null;
    this.committedSteps = 0;
    this.hoursPerHex = null;
    this.error = null;
    this.pendingArrival = null;
    this.busy = false;
    this.identity = null;
  }
  dispose(): void {
    this.clear();
  }
}

function sameHex(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
