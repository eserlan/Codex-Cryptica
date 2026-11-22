import type { PendingRoll } from "@codex/adventure-engine";
import type { AdventureState } from "#lib/stores/oracle/adventure-state.svelte.js";

export type AdventureHeaderTone = "danger" | "primary" | "neutral";

export interface AdventureHeaderStatus {
  phoneLabel: string;
  desktopLabel: string;
  tone: AdventureHeaderTone;
  icon: string | null;
  urgent: boolean;
  busy: boolean;
}

export interface AdventureHeaderStatusInput {
  readOnly: boolean;
  phase: AdventureState["phase"];
  pendingRoll: PendingRoll | null | undefined;
  elapsedLabel?: string | null;
}

/**
 * Derives compact phone header status metadata and desktop status copy with
 * strict urgency precedence: readOnly > offline > pendingRoll > generating > error > phase.
 */
export function deriveAdventureHeaderStatus({
  readOnly,
  phase,
  pendingRoll,
  elapsedLabel,
}: AdventureHeaderStatusInput): AdventureHeaderStatus {
  const desktopLabel =
    phase === "package-unavailable"
      ? "Package unavailable"
      : readOnly
        ? "Read-only in this tab"
        : phase === "offline"
          ? "Waiting for connection"
          : phase;

  if (phase === "package-unavailable") {
    return {
      phoneLabel: "Package unavailable",
      desktopLabel,
      tone: "danger",
      icon: "icon-[lucide--alert-circle]",
      urgent: true,
      busy: false,
    };
  }

  if (readOnly) {
    return {
      phoneLabel: "Read-only in this tab",
      desktopLabel,
      tone: "danger",
      icon: "icon-[lucide--lock]",
      urgent: true,
      busy: false,
    };
  }

  if (phase === "offline") {
    return {
      phoneLabel: "Waiting for connection",
      desktopLabel,
      tone: "danger",
      icon: "icon-[lucide--wifi-off]",
      urgent: true,
      busy: false,
    };
  }

  if (pendingRoll) {
    return {
      phoneLabel: pendingRoll.suppliedOutcome
        ? "Resolving roll"
        : "Roll needed",
      desktopLabel,
      tone: "primary",
      icon: "icon-[lucide--dices]",
      urgent: true,
      busy: false,
    };
  }

  if (phase === "generating") {
    return {
      phoneLabel: "Generating…",
      desktopLabel,
      tone: "primary",
      icon: "icon-[lucide--loader-2]",
      urgent: false,
      busy: true,
    };
  }

  if (phase === "error") {
    return {
      phoneLabel: "Needs attention",
      desktopLabel,
      tone: "danger",
      icon: "icon-[lucide--alert-circle]",
      urgent: true,
      busy: false,
    };
  }

  return {
    phoneLabel: elapsedLabel ? `${phase} · ${elapsedLabel}` : phase,
    desktopLabel,
    tone: "neutral",
    icon: null,
    urgent: false,
    busy: false,
  };
}

export interface PhoneToolsSummaryInput {
  discoveriesCount: number;
  situationsCount: number;
  readOnly: boolean;
}

export interface PhoneToolsSummary {
  ariaLabel: string;
  badgeCount: number;
  badgeText: string | null;
  badgeTone: AdventureHeaderTone;
  liveAnnouncement: string;
}

function normalizeCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count);
}

/**
 * Summarizes hidden phone-sheet counts and urgent recovery availability for
 * the compact header tools button and polite live region.
 */
export function derivePhoneToolsSummary({
  discoveriesCount,
  situationsCount,
  readOnly,
}: PhoneToolsSummaryInput): PhoneToolsSummary {
  const discoveries = normalizeCount(discoveriesCount);
  const situations = normalizeCount(situationsCount);
  const badgeCount = discoveries + situations;
  const badgeText =
    badgeCount > 99 ? "99+" : badgeCount > 0 ? String(badgeCount) : null;
  const badgeTone: AdventureHeaderTone = readOnly
    ? "danger"
    : badgeCount > 0
      ? "primary"
      : "neutral";

  const countParts: string[] = [];
  if (discoveries > 0) {
    countParts.push(
      `${discoveries} ${discoveries === 1 ? "discovery" : "discoveries"}`,
    );
  }
  if (situations > 0) {
    countParts.push(
      `${situations} active ${situations === 1 ? "situation" : "situations"}`,
    );
  }

  const labelParts = [...countParts];
  if (readOnly) {
    labelParts.push("read-only recovery available");
  }

  const ariaLabel =
    labelParts.length > 0
      ? `Adventure tools (${labelParts.join(", ")})`
      : "Adventure tools";

  let liveAnnouncement = "";
  if (countParts.length > 0 && readOnly) {
    liveAnnouncement = `${countParts.join(", ")}; read-only recovery available in Adventure tools.`;
  } else if (countParts.length > 0) {
    liveAnnouncement = `${countParts.join(", ")} in Adventure tools.`;
  } else if (readOnly) {
    liveAnnouncement =
      "Read-only in this tab. Recovery options in Adventure tools.";
  }

  return {
    ariaLabel,
    badgeCount,
    badgeText,
    badgeTone,
    liveAnnouncement,
  };
}
