import type { PublicGeneratorOutput } from "./public-generator-adapters";

/** A single selected rumour. gmOnly must never enter player-facing UI, logs or URLs. */
export interface SelectedRumourForPlay {
  batchTitle: string;
  index: number;
  origin: {
    kind: "rumour";
    batchTitle: string;
    index: number;
    sourceRecordId?: string;
  };
  playerVisible: { rumour: string; lead: string; source: string };
  gmOnly: {
    reality: "essentially true" | "exaggeration" | "dangerous misconception";
    whatsActuallyHappening: string;
    ifInvestigated: string;
  };
}

export type RumourSelectionInput = Pick<
  PublicGeneratorOutput,
  "title" | "content" | "lore"
>;

export class RumourSelectionError extends Error {
  constructor(
    readonly reason:
      | "invalid-index"
      | "malformed-content"
      | "malformed-lore"
      | "unpaired-rumour",
  ) {
    super("Cannot select this rumour: " + reason);
    this.name = "RumourSelectionError";
  }
}

type Side = "player" | "gm";

function sections(markdown: string, side: Side): Map<number, string> {
  const fail = () =>
    new RumourSelectionError(
      side === "player" ? "malformed-content" : "malformed-lore",
    );
  const normalized = markdown.replace(/\r\n/g, "\n");
  const heading =
    side === "player"
      ? /^### Rumour (\d+)[ \t]*$/gm
      : /^### GM Notes — Rumour (\d+)[ \t]*$/gm;
  const found = [...normalized.matchAll(heading)];
  const allHeadings =
    side === "player"
      ? [...normalized.matchAll(/^### Rumour\b[^\n]*$/gm)]
      : [...normalized.matchAll(/^### GM Notes\b[^\n]*$/gm)];
  if (found.length !== 6 || allHeadings.length !== 6) throw fail();

  const result = new Map<number, string>();
  for (let i = 0; i < found.length; i += 1) {
    const match = found[i]!;
    const number = Number(match[1]);
    if (number !== i + 1 || result.has(number)) throw fail();
    const start = match.index! + match[0].length;
    const end = found[i + 1]?.index ?? normalized.length;
    const body = normalized.slice(start, end).trim();
    if (!body || /^### (?:Rumour|GM Notes)\b/m.test(body)) throw fail();
    result.set(number, body);
  }
  return result;
}

function readFields(
  body: string,
  expected: readonly string[],
  errorKind: "malformed-content" | "malformed-lore",
): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of body
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const match = /^- \*\*([^*]+)\*\*:\s*(.*?)\s*$/.exec(line);
    if (
      !match ||
      !expected.includes(match[1]!) ||
      !match[2] ||
      fields.has(match[1]!)
    ) {
      throw new RumourSelectionError(errorKind);
    }
    fields.set(match[1]!, match[2]!);
  }
  if (fields.size !== expected.length)
    throw new RumourSelectionError(errorKind);
  return fields;
}

/** Extract only the selected entry and the matching hidden GM note. */
export function selectRumourForPlay(
  batch: RumourSelectionInput,
  index: number,
  sourceRecordId?: string,
): SelectedRumourForPlay {
  if (!Number.isInteger(index) || index < 1 || index > 6) {
    throw new RumourSelectionError("invalid-index");
  }
  // Validate both entire batches; a malformed pair must not be launched.
  const publicBody = sections(batch.content, "player").get(index);
  const gmBody = sections(batch.lore, "gm").get(index);
  if (!publicBody || !gmBody) throw new RumourSelectionError("unpaired-rumour");

  const p = readFields(
    publicBody,
    ["Rumour", "Lead", "Source"],
    "malformed-content",
  );
  const gm = readFields(
    gmBody,
    ["Reality", "What's Actually Happening", "If Investigated"],
    "malformed-lore",
  );
  const reality = gm.get("Reality");
  if (
    reality !== "essentially true" &&
    reality !== "exaggeration" &&
    reality !== "dangerous misconception"
  ) {
    throw new RumourSelectionError("malformed-lore");
  }
  const batchTitle = batch.title.trim() || "Word Around Town";
  return {
    batchTitle,
    index,
    origin: {
      kind: "rumour",
      batchTitle,
      index,
      ...(sourceRecordId ? { sourceRecordId } : {}),
    },
    playerVisible: {
      rumour: p.get("Rumour")!,
      lead: p.get("Lead")!,
      source: p.get("Source")!,
    },
    gmOnly: {
      reality,
      whatsActuallyHappening: gm.get("What's Actually Happening")!,
      ifInvestigated: gm.get("If Investigated")!,
    },
  };
}
