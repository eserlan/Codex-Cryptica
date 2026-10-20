import type { FeedbackKind } from "./contract";

export interface FeedbackRecord {
  reference: string;
  kind: FeedbackKind;
  receivedAt: string;
  description: string;
  contactEmail?: string;
  meta: { appVersion: string; area: string; browser: string; screen: string };
}

export interface TriageIssue {
  title: string;
  body: string;
  labels: string[];
}

const KIND_LABEL: Record<FeedbackKind, string> = {
  problem: "Problem",
  idea: "Idea",
  other: "Other",
};

/** A fence one backtick longer than the longest backtick run, so the text cannot close it. */
function fenced(text: string): string {
  const runs = (text.match(/`+/g) ?? []).map((run) => run.length + 1);
  const fence = "`".repeat(Math.max(3, ...runs));
  return [`${fence}text`, text, fence].join("\n");
}

/**
 * Builds the private GitHub issue. The title holds no user text. The body is
 * allowlisted metadata plus the user's words inside a fence, which GitHub
 * renders as inert text.
 */
export function renderTriageIssue(record: FeedbackRecord): TriageIssue {
  const label = KIND_LABEL[record.kind];
  const lines = [
    `**Kind:** ${label}`,
    `**Reference:** ${record.reference}`,
    `**Received:** ${record.receivedAt}`,
    `**App version:** ${record.meta.appVersion}`,
    `**Area:** ${record.meta.area}`,
    `**Browser:** ${record.meta.browser}`,
    `**Screen:** ${record.meta.screen}`,
    "",
    "### Description",
    "",
    fenced(record.description),
  ];
  if (record.contactEmail) {
    lines.push("", "### Contact", "", fenced(record.contactEmail));
  }
  return {
    title: `[${label}] ${record.reference}`,
    body: lines.join("\n"),
    labels: [`report:${record.kind}`],
  };
}
