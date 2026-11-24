import { resolveOracleProxyUrl } from "#lib/config/oracle-proxy.js";
import { featureFlags } from "#lib/stores/feature-flags.svelte.js";
import type { ArtworkCueIndicator } from "./artwork-cue-summary";

export interface ArtworkDemandReportPayload {
  type: "location" | "npc" | "scene" | "atmosphere" | "monster";
  genre: string;
  knownCues: string[];
  unmappedCues: string[];
  demographicCues: string[];
  matchedAssetId: string | null;
}

export interface ArtworkDemandReporterDeps {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  resolveProxyUrl?: () => string;
  isOnline?: () => boolean;
  isEnabled?: () => boolean;
}

const MAX_CUE_ITEMS = 16;
const MAX_DEMOGRAPHIC_CUE_ITEMS = 8;

function boundedCues(
  cues: readonly string[] | undefined,
  maxItems: number,
): string[] {
  return [...new Set(cues ?? [])].sort().slice(0, maxItems);
}

function normalizeCatalogueMatchId(match: string | null): string | null {
  if (!match) return null;
  // Vault/private image matches carry prefixes like "vault:..." — do not leak paths.
  if (match.includes(":")) return "vault-custom";
  return match;
}

function buildSignature(payload: ArtworkDemandReportPayload): string {
  return JSON.stringify([
    payload.type,
    payload.genre,
    payload.matchedAssetId,
    payload.knownCues,
    payload.unmappedCues,
    payload.demographicCues,
  ]);
}

/**
 * Privacy-safe, per-session deduplicated reporter for Solo Adventure Mode artwork
 * cue demand. Sends only normalized/structured cue tags (never names or narration)
 * and only when `artworkDemandTelemetry` is enabled.
 */
export class ArtworkDemandReporter {
  private readonly sentSignatures = new Set<string>();
  private activeSessionId: string | null = null;
  private readonly fetchFn: (
    input: string,
    init?: RequestInit,
  ) => Promise<Response>;
  private readonly resolveProxyUrl: () => string;
  private readonly isOnline: () => boolean;
  private readonly isEnabled: () => boolean;

  constructor(deps: ArtworkDemandReporterDeps = {}) {
    this.fetchFn = deps.fetchFn ?? ((input, init) => fetch(input, init));
    this.resolveProxyUrl = deps.resolveProxyUrl ?? resolveOracleProxyUrl;
    this.isOnline =
      deps.isOnline ??
      (() => (typeof navigator === "undefined" ? true : navigator.onLine));
    this.isEnabled =
      deps.isEnabled ??
      (() => featureFlags.isEnabled("artworkDemandTelemetry"));
  }

  private enqueuePayload(payload: ArtworkDemandReportPayload): void {
    const hasCues =
      payload.knownCues.length > 0 ||
      payload.unmappedCues.length > 0 ||
      payload.demographicCues.length > 0;
    if (!hasCues) return;

    const signature = buildSignature(payload);
    if (this.sentSignatures.has(signature)) return;
    this.sentSignatures.add(signature);
    void this.send(payload);
  }

  private enqueueSlot(
    type: ArtworkDemandReportPayload["type"],
    genre: string,
    slot: {
      cues: readonly string[];
      unmappedCues?: readonly string[];
      demographicCues?: readonly string[];
      match: string | null;
    },
  ): void {
    this.enqueuePayload({
      type,
      genre,
      knownCues: boundedCues(slot.cues, MAX_CUE_ITEMS),
      unmappedCues: boundedCues(slot.unmappedCues, MAX_CUE_ITEMS),
      demographicCues: boundedCues(
        slot.demographicCues,
        MAX_DEMOGRAPHIC_CUE_ITEMS,
      ),
      matchedAssetId: normalizeCatalogueMatchId(slot.match),
    });
  }

  private enqueueAll(
    type: ArtworkDemandReportPayload["type"],
    genre: string,
    slots: readonly {
      cues: readonly string[];
      unmappedCues?: readonly string[];
      demographicCues?: readonly string[];
      match: string | null;
    }[],
  ): void {
    for (const slot of slots) {
      this.enqueueSlot(type, genre, slot);
    }
  }

  reportFromSummary(
    summary: ArtworkCueIndicator | null,
    sessionId: string | null,
  ): void {
    if (sessionId !== this.activeSessionId) {
      this.sentSignatures.clear();
      this.activeSessionId = sessionId;
    }
    if (!sessionId) return;
    if (!summary || !this.isEnabled() || !this.isOnline()) return;

    if (summary.place)
      this.enqueueSlot("location", summary.genre, summary.place);
    if (summary.scene) this.enqueueSlot("scene", summary.genre, summary.scene);
    if (summary.atmosphere)
      this.enqueueSlot("atmosphere", summary.genre, summary.atmosphere);
    this.enqueueAll("npc", summary.genre, summary.npcs);
    this.enqueueAll("monster", summary.genre, summary.monsters ?? []);
  }

  private async send(payload: ArtworkDemandReportPayload): Promise<void> {
    try {
      const baseUrl = this.resolveProxyUrl().replace(/\/+$/, "");
      if (!baseUrl) return;
      await this.fetchFn(`${baseUrl}/api/artwork-demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Telemetry is strictly best-effort and must never disrupt play.
    }
  }
}

export const artworkDemandReporter = new ArtworkDemandReporter();
