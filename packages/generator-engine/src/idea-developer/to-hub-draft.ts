import { developmentToText } from "./format";
import type { Development } from "./types";

/**
 * Turns a conversation's development into a Session Hub draft (#3228).
 *
 * The hub is how the idea reaches other generators: they fold reusable drafts
 * into their prompts using the first 180 characters of `summary`, so the idea
 * has to lead there. The shape matches what existing generator drafts use.
 */
export interface IdeaDeveloperHubDraft {
  type: "note";
  title: string;
  summary: string;
  content: string;
  labels: string[];
  status: "draft";
  reuseEnabled: true;
  pinned: false;
  selectedForSave: true;
}

const SUMMARY_LIMIT = 180;
const TITLE_LIMIT = 60;
const FALLBACK_TITLE = "Idea development";

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cutAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
}

function buildSummary(idea: string): string {
  const text = collapse(idea);
  if (text.length <= SUMMARY_LIMIT) return text;
  return `${cutAtWord(text, SUMMARY_LIMIT - 1)}…`;
}

function buildTitle(idea: string): string {
  const text = collapse(idea);
  if (!text) return FALLBACK_TITLE;
  const clause = text.split(/[.!?;:]/)[0] || text;
  return (
    cutAtWord(clause, TITLE_LIMIT).replace(/[\s,.;:]+$/, "") || FALLBACK_TITLE
  );
}

export function toHubDraft(
  development: Development,
  ideaText: string,
): IdeaDeveloperHubDraft {
  return {
    type: "note",
    title: buildTitle(ideaText),
    summary: buildSummary(ideaText),
    content: developmentToText(development, ideaText),
    labels: ["idea-developer", development.mode],
    status: "draft",
    reuseEnabled: true,
    pinned: false,
    selectedForSave: true,
  };
}
