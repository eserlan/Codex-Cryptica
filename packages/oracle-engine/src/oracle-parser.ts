import type { OracleIntent } from "./types";

/** Most cards one `/deck` command will deal. See the cap's use below. */
const MAX_DRAW_COUNT = 100;

export class OracleCommandParser {
  static parse(query: string, aiDisabled: boolean): OracleIntent {
    const q = query.toLowerCase().trim();
    // Commands match against the trimmed, lowercased form, so any command that
    // slices an argument out has to slice the trimmed form too. Slicing the raw
    // input by a matched prefix's length is off by however much leading
    // whitespace the user typed, and the caller does not trim before parsing.
    const trimmed = query.trim();

    if (q === "/help") return { type: "help" };
    if (q === "/clear") return { type: "clear" };
    if (q === "/revise") return { type: "revise" };

    if (q.startsWith("/roll")) {
      const formula = query.slice(5).trim();
      if (!formula)
        return {
          type: "error",
          message: "Please specify a roll formula (e.g. /roll 1d20).",
        };
      return { type: "roll", formula };
    }

    // `/table` and `/deck` rather than `/draw`: `draw` is already routed to
    // the visualization executor for image generation (#2247, research R5).
    if (q === "/table" || q.startsWith("/table ")) {
      const sourceName = trimmed.slice("/table".length).trim();
      if (!sourceName) {
        return {
          type: "error",
          message:
            "Please name a table to roll (e.g. /table Forest Encounters).",
        };
      }
      return { type: "roll-table", sourceName };
    }

    if (q === "/deck" || q.startsWith("/deck ")) {
      const rest = trimmed.slice("/deck".length).trim();
      if (!rest) {
        return {
          type: "error",
          message:
            "Please name a deck to draw from (e.g. /deck Complications).",
        };
      }
      // A trailing number *may* be a card count ("/deck Tarot 3"), but it may
      // equally be part of the name ("/deck Deck 52"). The parser cannot tell,
      // so it reports both readings and lets the executor prefer whichever
      // actually names a deck.
      const withCount = rest.match(/^(.*?)\s+(\d+)$/);
      if (withCount) {
        return {
          type: "draw-deck",
          sourceName: rest,
          countedName: withCount[1].trim(),
          // Capped: a with-replacement draw loops once per card, each a
          // rejection-sampled roll, so an unbounded count out of a typo would
          // lock the thread rather than return a silly result.
          drawCount: Math.min(
            Math.max(Number(withCount[2]), 1),
            MAX_DRAW_COUNT,
          ),
        };
      }
      return { type: "draw-deck", sourceName: rest };
    }

    if (q.startsWith("/create")) {
      const quotedRegex =
        /\/create\s+"([^"]+)"(?:\s+as\s+("([^"]+)"|(\w+)))?\s*$/i;
      const match = query.match(quotedRegex);
      if (match) {
        const entityName = match[1];
        const rawType = (match[3] || match[4] || "character").toLowerCase();
        const allowedTypes = [
          "character",
          "npc",
          "faction",
          "location",
          "item",
          "event",
          "concept",
        ];
        const entityType = allowedTypes.includes(rawType)
          ? rawType
          : "character";
        return { type: "create", entityName, entityType, isDrawing: false };
      }
      if (aiDisabled)
        return {
          type: "error",
          message:
            'Invalid format. Use: /create "Entity Name" or /create "Entity Name" as "Type"',
        };
    }

    if (q.startsWith("/connect")) {
      const quotedRegex = /\/connect\s+"([^"]+)"\s+(.+?)\s+"([^"]+)"\s*$/i;
      const match = query.match(quotedRegex);
      if (match) {
        return {
          type: "connect",
          sourceName: match[1],
          label: match[2].trim(),
          targetName: match[3],
        };
      }
      if (aiDisabled)
        return {
          type: "error",
          message: 'Invalid format. Use: /connect "Entity A" label "Entity B"',
        };
      return { type: "connect-ai", query };
    }

    if (q.startsWith("/merge")) {
      const quotedRegex = /\/merge\s+"([^"]+)"\s+into\s+"([^"]+)"\s*$/i;
      const match = query.match(quotedRegex);
      if (match) {
        return {
          type: "merge",
          sourceName: match[1],
          targetName: match[2],
        };
      }
      if (aiDisabled)
        return {
          type: "error",
          message: 'Invalid format. Use: /merge "Source" into "Target"',
        };
      return { type: "merge-ai", query };
    }

    if (q.startsWith("/plot")) {
      if (aiDisabled)
        return {
          type: "error",
          message:
            "❌ The /plot command is powered by AI and is disabled. Enable AI in settings to use story tension analysis.",
        };
      let subject = query.replace(/^\/plot\s*/i, "").trim();
      if (subject.startsWith('"') && subject.endsWith('"')) {
        subject = subject.slice(1, -1).trim();
      }
      return { type: "plot", query: subject };
    }

    if (q.startsWith("/draw") || q.startsWith("/image")) {
      if (aiDisabled)
        return {
          type: "error",
          message:
            "❌ The /draw command is powered by AI and is disabled. Enable AI in settings to use image generation.",
        };
    }

    const { query: cleanQuery, cue } = extractCueAndQuery(query);
    return { type: "chat", query: cleanQuery, cue, isAIIntent: !aiDisabled };
  }

  static detectImageIntent(query: string): boolean {
    const q = query.toLowerCase().trim();

    if (q.startsWith("/draw") || q.startsWith("/image")) return true;

    if (
      q.includes("generate an image") ||
      q.includes("generate a picture") ||
      q.includes("generate a photo")
    ) {
      return true;
    }

    if (/\bportrait of\b/.test(q) || /\bsketch of\b/.test(q)) return true;

    const imageNouns = [
      "image",
      "picture",
      "photo",
      "photograph",
      "illustration",
      "portrait",
      "scene",
      "logo",
      "icon",
      "diagram",
      "map",
    ];

    const verbs = [
      "draw",
      "sketch",
      "paint",
      "illustrate",
      "visualize",
      "show",
      "generate",
      "create",
    ];

    for (const verb of verbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`);
      if (!verbRegex.test(q)) continue;

      for (const noun of imageNouns) {
        const pattern = new RegExp(`\\b${verb}\\b[\\s\\S]{0,80}\\b${noun}\\b`);
        if (pattern.test(q)) return true;
      }
    }

    return false;
  }

  static detectCreationIntent(query: string): boolean {
    const q = query.toLowerCase().trim();

    if (q.startsWith("/create")) return true;

    if (
      q.includes("create a record") ||
      q.includes("add an entity") ||
      q.includes("archive a") ||
      q.includes("formally document")
    ) {
      return true;
    }

    const creationVerbs = [
      "create",
      "add",
      "make",
      "new",
      "archive",
      "document",
    ];
    const entityNouns = [
      "npc",
      "character",
      "location",
      "faction",
      "item",
      "event",
      "record",
      "entity",
    ];

    for (const verb of creationVerbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`, "i");
      if (!verbRegex.test(q)) continue;

      for (const noun of entityNouns) {
        const pattern = new RegExp(
          `\\b${verb}\\b[\\s\\S]{0,100}\\b${noun}\\b`,
          "i",
        );
        if (pattern.test(q)) return true;
      }
    }

    return false;
  }

  static detectPlotIntent(query: string): boolean {
    const q = query.toLowerCase().trim();

    if (q.startsWith("/plot")) return true;

    const plotKeywords = [
      "plot hook",
      "adventure seed",
      "campaign arc",
      "session idea",
      "mystery",
      "story development",
      "consequence",
      "conflict",
    ];

    if (plotKeywords.some((keyword) => q.includes(keyword))) {
      return true;
    }

    const plotVerbs = ["generate", "suggest", "create", "think of", "give me"];
    const plotNouns = [
      "plot",
      "hook",
      "adventure",
      "arc",
      "seed",
      "mystery",
      "development",
    ];

    for (const verb of plotVerbs) {
      const verbRegex = new RegExp(`\\b${verb}\\b`, "i");
      if (!verbRegex.test(q)) continue;

      for (const noun of plotNouns) {
        const pattern = new RegExp(
          `\\b${verb}\\b[\\s\\S]{0,100}\\b${noun}\\b`,
          "i",
        );
        if (pattern.test(q)) return true;
      }
    }

    return false;
  }
}

/**
 * Extracts optional director/oracle cues formatted as `(Cue: ...)`, `[Cue: ...]`,
 * `[Oracle: ...]`, or `(Oracle: ...)` either at the beginning or end of a query string.
 */
export function extractCueAndQuery(rawQuery: string): {
  query: string;
  cue?: string;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) return { query: "" };

  // Match prefix: (Cue: ...) or [Cue: ...] or [Oracle: ...] or (Oracle: ...)
  const prefixMatch = trimmed.match(
    /^(?:\((?:cue|oracle):\s*([\s\S]*?)\)|\[(?:cue|oracle):\s*([\s\S]*?)\])\s*([\s\S]*)$/i,
  );
  if (prefixMatch) {
    const cue = (prefixMatch[1] ?? prefixMatch[2] ?? "").trim();
    const restQuery = prefixMatch[3].trim();
    return {
      query: restQuery || cue,
      cue: cue || undefined,
    };
  }

  // Match suffix: <query> (Cue: ...) or <query> [Oracle: ...]
  const suffixMatch = trimmed.match(
    /^([\s\S]*?)\s*(?:\((?:cue|oracle):\s*([\s\S]*?)\)|\[(?:cue|oracle):\s*([\s\S]*?)\])$/i,
  );
  if (suffixMatch && suffixMatch[1].trim()) {
    const cue = (suffixMatch[2] ?? suffixMatch[3] ?? "").trim();
    return {
      query: suffixMatch[1].trim(),
      cue: cue || undefined,
    };
  }

  return { query: trimmed };
}
