export type AdventurePhase =
  | "idle"
  | "starting"
  | "ready"
  | "generating"
  | "awaiting-roll"
  | "recording-outcome"
  | "ready-to-resolve"
  | "resolving-roll"
  | "committing"
  | "ending"
  | "error"
  | "offline";

const transitions: Record<AdventurePhase, readonly AdventurePhase[]> = {
  idle: ["starting", "ready"],
  starting: ["generating", "ready", "error", "offline"],
  ready: ["generating", "ending", "offline"],
  generating: ["committing", "awaiting-roll", "error", "offline", "ready"],
  "awaiting-roll": ["recording-outcome", "ready", "offline"],
  "recording-outcome": ["ready-to-resolve", "error", "offline"],
  "ready-to-resolve": ["resolving-roll", "ready", "offline"],
  "resolving-roll": ["committing", "error", "offline", "ready-to-resolve"],
  committing: ["ready", "error", "offline"],
  ending: ["idle", "error", "offline"],
  error: ["ready", "starting", "generating", "offline"],
  offline: [
    "ready",
    "starting",
    "generating",
    "recording-outcome",
    "resolving-roll",
  ],
};

export function canTransition(
  from: AdventurePhase,
  to: AdventurePhase,
): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(
  from: AdventurePhase,
  to: AdventurePhase,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`invalid-transition:${from}->${to}`);
  }
}

export function isBusy(phase: AdventurePhase): boolean {
  return [
    "starting",
    "generating",
    "recording-outcome",
    "resolving-roll",
    "committing",
    "ending",
  ].includes(phase);
}
