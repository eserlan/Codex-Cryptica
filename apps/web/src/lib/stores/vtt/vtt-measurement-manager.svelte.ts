import type {
  MeasurementState,
  PingState,
  VTTMessage,
  Token,
} from "../../../types/vtt";
import type { Point } from "schema";
import { hashToColor, cloneMeasurement } from "$lib/utils/vtt-helpers";
import { systemClock } from "$lib/utils/runtime-deps";

/**
 * How long a ping stays alive — both for visual animation in MapCanvas and
 * for the manager's cleanup timeout below.  Centralised so the two can't
 * drift out of sync.
 */
export const PING_DURATION_MS = 3000;

export interface VTTMeasurementManagerDependencies {
  emit: (message: VTTMessage) => void;
  getMyPeerId: () => string | null;
  persistDraft: () => void;
  getTokens: () => Record<string, Token>;
  getMapId: () => string | null;
}

export class VTTMeasurementManager {
  measurement = $state<MeasurementState>({
    active: false,
    start: null,
    end: null,
  });
  activeMeasurement = $state<(MeasurementState & { peerId: string }) | null>(
    null,
  );
  lastPing = $state<PingState | null>(null);
  pings = $state<Record<string, PingState>>({});

  // ⚡ Bolt Optimization: Cache Object.values for pings to avoid re-allocation in reactive blocks
  allPings = $derived.by(() => Object.values(this.pings));

  private pingTimeouts = new Map<string, number>();

  constructor(private deps: VTTMeasurementManagerDependencies) {}

  reset() {
    this.measurement = {
      active: false,
      start: null,
      end: null,
    };
    this.activeMeasurement = null;
    this.lastPing = null;
    this.clearPings();
  }

  setSnapshotData(measurement: MeasurementState, lastPing: PingState | null) {
    this.measurement = cloneMeasurement(measurement);
    this.lastPing = lastPing;
  }

  setMeasurementActive(active: boolean) {
    const wasActive = this.measurement.active;
    this.measurement = {
      ...this.measurement,
      active,
      start: active ? this.measurement.start : null,
      end: active ? this.measurement.end : null,
      locked: active ? this.measurement.locked : false,
    };
    this.deps.persistDraft();

    if (wasActive !== active) {
      const peerId = this.deps.getMyPeerId() || "host";
      this.deps.emit({
        type: "MEASUREMENT",
        active,
        startX: this.measurement.start?.x ?? 0,
        startY: this.measurement.start?.y ?? 0,
        endX: this.measurement.end?.x ?? 0,
        endY: this.measurement.end?.y ?? 0,
        peerId,
      });
    }
  }

  setMeasurementStart(start: Point | null) {
    this.measurement = {
      ...this.measurement,
      active: !!start,
      start,
      end: start ? this.measurement.end : null,
      locked: false,
    };
    this.deps.persistDraft();

    const peerId = this.deps.getMyPeerId() || "host";
    this.deps.emit({
      type: "MEASUREMENT",
      active: !!start,
      startX: start?.x ?? 0,
      startY: start?.y ?? 0,
      endX: this.measurement.end?.x ?? 0,
      endY: this.measurement.end?.y ?? 0,
      peerId,
    });
  }

  setMeasurementEnd(end: Point | null, silent = false) {
    this.measurement = {
      ...this.measurement,
      active: !!this.measurement.start,
      end,
    };
    if (!silent) {
      this.deps.persistDraft();
    }

    const peerId = this.deps.getMyPeerId() || "host";
    this.deps.emit({
      type: "MEASUREMENT",
      active: !!this.measurement.start,
      startX: this.measurement.start?.x ?? 0,
      startY: this.measurement.start?.y ?? 0,
      endX: end?.x ?? 0,
      endY: end?.y ?? 0,
      peerId,
    });
  }

  setMeasurementLocked(locked: boolean) {
    this.measurement = {
      ...this.measurement,
      locked,
    };
    this.deps.persistDraft();
  }

  clearMeasurement() {
    this.measurement = {
      active: false,
      start: null,
      end: null,
      locked: false,
    };
    this.deps.persistDraft();
  }

  handleRemoteMeasurement(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    peerId: string,
    active: boolean,
  ) {
    if (!active) {
      if (this.activeMeasurement?.peerId === peerId) {
        this.activeMeasurement = null;
      }
      return;
    }

    this.activeMeasurement = {
      active: true,
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      peerId,
    };
    this.deps.persistDraft();
  }

  ping(x: number, y: number) {
    if (!this.deps.getMapId()) return;
    const peerId = this.deps.getMyPeerId() || "host";
    const color = hashToColor(peerId);
    const pingObj = {
      x,
      y,
      peerId,
      color,
      timestamp: systemClock.now(),
    };
    this.registerPing(pingObj);
    this.deps.emit({
      type: "PING",
      ...pingObj,
    });
  }

  pingToken(tokenId: string) {
    const tokens = this.deps.getTokens();
    const token = tokens[tokenId];
    if (!token) return;
    this.ping(token.x + token.width / 2, token.y + token.height / 2);
  }

  handleRemotePing(
    x: number,
    y: number,
    peerId: string,
    color?: string,
    timestamp?: number,
  ) {
    const resolvedColor = color || hashToColor(peerId);
    this.registerPing({
      x,
      y,
      peerId,
      color: resolvedColor,
      timestamp: timestamp ?? systemClock.now(),
    });
  }

  clearPing(peerId: string) {
    const timeoutId = this.pingTimeouts.get(peerId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pingTimeouts.delete(peerId);
    }

    if (!this.pings[peerId]) return;
    const next = { ...this.pings };
    delete next[peerId];
    this.pings = next;
  }

  registerPing(ping: PingState) {
    this.clearPing(ping.peerId);
    this.lastPing = { ...ping };
    this.pings = {
      ...this.pings,
      [ping.peerId]: { ...ping },
    };

    const timeoutId = window.setTimeout(() => {
      const current = this.pings[ping.peerId];
      if (current && current.timestamp === ping.timestamp) {
        const next = { ...this.pings };
        delete next[ping.peerId];
        this.pings = next;
        if (
          this.lastPing?.peerId === ping.peerId &&
          this.lastPing.timestamp === ping.timestamp
        ) {
          this.lastPing = null;
        }
      }
      this.pingTimeouts.delete(ping.peerId);
    }, PING_DURATION_MS);
    this.pingTimeouts.set(ping.peerId, timeoutId);
  }

  clearPings() {
    for (const timeoutId of this.pingTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.pingTimeouts.clear();
    this.pings = {};
    this.lastPing = null;
  }
}
