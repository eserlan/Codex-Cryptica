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
  const lines = body
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  // Exactly the expected labels, once each, in the advertised order.
  if (lines.length !== expected.length) {
    throw new RumourSelectionError(errorKind);
  }
  lines.forEach((line, position) => {
    const match = /^- \*\*([^*]+)\*\*:\s*(.*?)\s*$/.exec(line);
    if (!match || match[1] !== expected[position] || !match[2]) {
      throw new RumourSelectionError(errorKind);
    }
    fields.set(match[1]!, match[2]!);
  });
  return fields;
}

const PLAYER_FIELDS = ["Rumour", "Lead", "Source"] as const;
const GM_FIELDS = [
  "Reality",
  "What's Actually Happening",
  "If Investigated",
] as const;

type Reality = SelectedRumourForPlay["gmOnly"]["reality"];

function readReality(fields: Map<string, string>): Reality {
  const reality = fields.get("Reality");
  if (
    reality !== "essentially true" &&
    reality !== "exaggeration" &&
    reality !== "dangerous misconception"
  ) {
    throw new RumourSelectionError("malformed-lore");
  }
  return reality;
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
  // Validate both entire batches, every entry, before returning one pair: a
  // malformed batch must not be launched even if the chosen entry is fine.
  const publicSections = sections(batch.content, "player");
  const gmSections = sections(batch.lore, "gm");
  const parsed = new Map<
    number,
    { p: Map<string, string>; gm: Map<string, string>; reality: Reality }
  >();
  for (let entry = 1; entry <= 6; entry += 1) {
    const publicBody = publicSections.get(entry);
    const gmBody = gmSections.get(entry);
    if (!publicBody || !gmBody) {
      throw new RumourSelectionError("unpaired-rumour");
    }
    const p = readFields(publicBody, PLAYER_FIELDS, "malformed-content");
    const gm = readFields(gmBody, GM_FIELDS, "malformed-lore");
    parsed.set(entry, { p, gm, reality: readReality(gm) });
  }
  const { p, gm, reality } = parsed.get(index)!;
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
