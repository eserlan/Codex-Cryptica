/**
 * The only observability the help route emits (#3427, spec FR-027).
 *
 * One structured line per request: what happened, how long it took, and which
 * feature area. It never carries the question, the answer, vault content, or
 * any user, session or address identifier, and it cannot be linked to an
 * individual. Whether a guidance action was accepted happens on the client and
 * is deliberately not measured.
 */

export const HELP_OUTCOMES = [
  "answered",
  "no-match",
  "out-of-scope",
  "error",
  "rate-limited",
] as const;
export type HelpOutcome = (typeof HELP_OUTCOMES)[number];

export const HELP_METRIC_AREAS = [
  "entity-detail",
  "graph",
  "session-hub",
  "tables",
  "generators",
  "other",
] as const;
export type HelpMetricArea = (typeof HELP_METRIC_AREAS)[number];

export interface HelpMetric {
  event: "help.request";
  outcome: HelpOutcome;
  latencyMs: number;
  area: HelpMetricArea;
}

/**
 * Builds a metric from untrusted input. Only the three known fields are read;
 * anything else is dropped, and an invalid value yields null rather than a
 * best guess, so a bug upstream cannot smuggle content into the log.
 */
export function buildHelpMetric(input: {
  outcome?: unknown;
  latencyMs?: unknown;
  area?: unknown;
}): HelpMetric | null {
  const { outcome, latencyMs, area } = input ?? {};
  if (!(HELP_OUTCOMES as readonly unknown[]).includes(outcome)) return null;
  if (!(HELP_METRIC_AREAS as readonly unknown[]).includes(area)) return null;
  if (
    typeof latencyMs !== "number" ||
    !Number.isFinite(latencyMs) ||
    latencyMs < 0
  ) {
    return null;
  }
  return {
    event: "help.request",
    outcome: outcome as HelpOutcome,
    latencyMs: Math.round(latencyMs),
    area: area as HelpMetricArea,
  };
}

export function emitHelpMetric(
  input: Parameters<typeof buildHelpMetric>[0],
  log: (line: string) => void = (line) => console.log(line),
): void {
  const metric = buildHelpMetric(input);
  if (metric) log(JSON.stringify(metric));
}
