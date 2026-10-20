import { FEEDBACK_KINDS, type FeedbackKind } from "./contract";

export const FEEDBACK_OUTCOMES = [
  "accepted",
  "duplicate",
  "rejected",
  "limited",
  "unavailable",
  "misconfigured",
] as const;
export type FeedbackOutcome = (typeof FEEDBACK_OUTCOMES)[number];

export interface FeedbackMetric {
  event: "feedback.report";
  outcome: FeedbackOutcome;
  kind?: FeedbackKind;
}

/**
 * Builds the usage line from known values only. Anything else is dropped, so
 * no text, address or reference can reach a log, whatever is passed in.
 */
export function buildFeedbackMetric(input: {
  outcome?: unknown;
  kind?: unknown;
}): FeedbackMetric | null {
  if (!(FEEDBACK_OUTCOMES as readonly unknown[]).includes(input.outcome))
    return null;
  const metric: FeedbackMetric = {
    event: "feedback.report",
    outcome: input.outcome as FeedbackOutcome,
  };
  if ((FEEDBACK_KINDS as readonly unknown[]).includes(input.kind))
    metric.kind = input.kind as FeedbackKind;
  return metric;
}

export function emitFeedbackMetric(
  input: Parameters<typeof buildFeedbackMetric>[0],
  log: (line: string) => void = (line) => console.log(line),
): void {
  const metric = buildFeedbackMetric(input);
  if (metric) log(JSON.stringify(metric));
}
