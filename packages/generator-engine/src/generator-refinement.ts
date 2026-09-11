/**
 * Framework-free contracts and helpers for refining generated drafts.
 *
 * This module deliberately knows nothing about the vault, Session Hub storage,
 * or a particular AI provider. The web app injects the revision runner around
 * this small, deterministic core.
 */

export interface RefinementDocument {
  id?: string;
  type: string;
  kind?: string;
  title: string;
  summary?: string;
  content: string;
  lore?: string;
  labels: string[];
  status?: "active" | "draft";
}

export interface RefinementProposal {
  title?: string;
  summary?: string;
  content?: string;
  lore?: string;
  labels?: string[];
}

export interface RefinableSource {
  id?: string;
  type?: string;
  kind?: string;
  title?: string;
  summary?: string;
  content?: string;
  lore?: string;
  labels?: string[];
  status?: "active" | "draft";
}

export function normalizeRefinementDocument(
  source: RefinableSource,
): RefinementDocument {
  return {
    ...(source.id ? { id: source.id } : {}),
    type: source.type?.trim() || "note",
    ...(source.kind ? { kind: source.kind } : {}),
    title: source.title?.trim() || "Untitled draft",
    ...(source.summary?.trim() ? { summary: source.summary.trim() } : {}),
    content: source.content?.trim() || source.lore?.trim() || "",
    ...(source.lore?.trim() ? { lore: source.lore.trim() } : {}),
    labels: Array.isArray(source.labels)
      ? source.labels
          .filter((label): label is string => typeof label === "string")
          .map((label) => label.trim())
          .filter(Boolean)
      : [],
    ...(source.status ? { status: source.status } : {}),
  };
}

function readText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Merge a model proposal while preserving source metadata omitted by the model. */
export function applyRefinementProposal(
  source: RefinementDocument,
  proposal: RefinementProposal,
): RefinementDocument {
  const title = readText(proposal.title) ?? source.title;
  const summary = readText(proposal.summary) ?? source.summary;
  const content = readText(proposal.content) ?? source.content;
  const lore = readText(proposal.lore) ?? source.lore;
  const labels = Array.isArray(proposal.labels)
    ? proposal.labels
        .filter((label): label is string => typeof label === "string")
        .map((label) => label.trim())
        .filter(Boolean)
    : source.labels;

  if (!title || (!content && !lore)) {
    throw new Error(
      "The refinement response did not contain usable draft content.",
    );
  }

  return {
    ...source,
    title,
    ...(summary ? { summary } : {}),
    content,
    ...(lore ? { lore } : {}),
    labels,
  };
}

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) return fenced.trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

/** Parse the strict JSON envelope returned by the refinement model. */
export function parseRefinementResponse(raw: string): RefinementProposal {
  if (!raw?.trim()) throw new Error("The refinement response was empty.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new Error("The refinement response was not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The refinement response had an invalid shape.");
  }

  const record = parsed as Record<string, unknown>;
  const proposal: RefinementProposal = {};
  for (const key of ["title", "summary", "content", "lore"] as const) {
    if (record[key] !== undefined && typeof record[key] !== "string") {
      throw new Error(`The refinement field '${key}' was not text.`);
    }
    if (typeof record[key] === "string") proposal[key] = record[key];
  }
  if (record.labels !== undefined) {
    if (
      !Array.isArray(record.labels) ||
      record.labels.some((label) => typeof label !== "string")
    ) {
      throw new Error("The refinement labels field was invalid.");
    }
    proposal.labels = record.labels as string[];
  }
  if (
    !proposal.title &&
    !proposal.summary &&
    !proposal.content &&
    !proposal.lore &&
    !proposal.labels
  ) {
    throw new Error("The refinement response contained no recognised fields.");
  }
  return proposal;
}

export function buildRefinementPrompt(
  source: RefinementDocument,
  instructions: string,
): string {
  return [
    "Refine the RPG draft below according to the user's instruction.",
    "Treat the user's instruction as the highest priority. Preserve details that were not requested to change.",
    "Return JSON only with these optional fields: title, summary, content, and lore are strings; labels is an array of strings.",
    "Do not include markdown fences or commentary.",
    "",
    `Type: ${source.type}`,
    source.kind ? `Kind: ${source.kind}` : "",
    `Title: ${source.title}`,
    `Summary: ${source.summary ?? ""}`,
    `Content:\n${source.content}`,
    `Lore:\n${source.lore ?? ""}`,
    `Labels: ${source.labels.join(", ")}`,
    "",
    `User instruction: ${instructions.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}
