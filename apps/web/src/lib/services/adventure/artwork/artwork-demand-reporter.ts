import { resolveOracleProxyUrl } from "#lib/config/oracle-proxy.js";
import { featureFlags } from "#lib/stores/feature-flags.svelte.js";
import type { ArtworkCueIndicator } from "./artwork-cue-summary";

export interface ArtworkDemandReportPayload {
  type: "location" | "npc";
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

  reportFromSummary(summary: ArtworkCueIndicator | null): void {
    if (!summary || !this.isEnabled() || !this.isOnline()) return;

    if (summary.place) {
      this.enqueuePayload({
        type: "location",
        genre: summary.genre,
        knownCues: [...summary.place.cues].sort(),
        unmappedCues: [...(summary.place.unmappedCues ?? [])].sort(),
        demographicCues: [],
        matchedAssetId: normalizeCatalogueMatchId(summary.place.match),
      });
    }

    for (const npc of summary.npcs) {
      this.enqueuePayload({
        type: "npc",
        genre: summary.genre,
        knownCues: [...npc.cues].sort(),
        unmappedCues: [...(npc.unmappedCues ?? [])].sort(),
        demographicCues: [...(npc.demographicCues ?? [])].sort(),
        matchedAssetId: normalizeCatalogueMatchId(npc.match),
      });
    }
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
