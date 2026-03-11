import type { OracleIntent } from "./types";

export class OracleCommandParser {
  private static EXPAND_KEYWORDS = [
    "expand",
    "describe",
    "elaborate",
    "tell me more",
    "detailed",
    "deep dive",
    "more",
    "anything else",
  ];

  static parse(query: string, liteMode: boolean): OracleIntent {
    const q = query.toLowerCase().trim();

    if (q === "/help") return { type: "help" };
    if (q === "/clear") return { type: "clear" };

    if (q.startsWith("/roll")) {
      const formula = query.slice(5).trim();
      if (!formula)
        return {
          type: "error",
          message: "Please specify a roll formula (e.g. /roll 1d20).",
        };
      return { type: "roll", formula };
    }

    if (q.startsWith("/create")) {
      const quotedRegex = /\/create\s+"([^"]+)"(?:\s+as\s+("([^"]+)"|(\w+)))?/i;
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
      if (liteMode)
        return {
          type: "error",
          message:
            'Invalid format. Use: /create "Entity Name" or /create "Entity Name" as "Type"',
        };
    }

    if (q.startsWith("/connect")) {
      const quotedRegex = /\/connect\s+"([^"]+)"\s+(.+?)\s+"([^"]+)"/i;
      const match = query.match(quotedRegex);
      if (match) {
        return {
          type: "connect",
          sourceName: match[1],
          label: match[2].trim(),
          targetName: match[3],
        };
      }
      if (liteMode)
        return {
          type: "error",
          message: 'Invalid format. Use: /connect "Entity A" label "Entity B"',
        };
    }

    if (q.startsWith("/merge")) {
      const quotedRegex = /\/merge\s+"([^"]+)"\s+into\s+"([^"]+)"/i;
      const match = query.match(quotedRegex);
      if (match) {
        return {
          type: "merge",
          sourceName: match[1],
          targetName: match[2],
        };
      }
      if (liteMode)
        return {
          type: "error",
          message: 'Invalid format. Use: /merge "Source" into "Target"',
        };
    }

    if (q.startsWith("/plot")) {
      if (liteMode)
        return {
          type: "error",
          message:
            "❌ The /plot command is powered by AI and is disabled in Lite Mode. Disable Lite Mode in settings to use story tension analysis.",
        };
      let subject = query.replace(/^\/plot\s*/i, "").trim();
      if (subject.startsWith('"') && subject.endsWith('"')) {
        subject = subject.slice(1, -1).trim();
      }
      return { type: "plot", query: subject };
    }

    if (q.startsWith("/draw") || q.startsWith("/image")) {
      if (liteMode)
        return {
          type: "error",
          message:
            "❌ The /draw command is powered by AI and is disabled in Lite Mode. Disable Lite Mode in settings to use image generation.",
        };
    }

    return { type: "chat", query, isAIIntent: !liteMode };
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

  static isExpandRequest(query: string): boolean {
    const q = query.toLowerCase().trim();
    return this.EXPAND_KEYWORDS.some((keyword) => q.includes(keyword));
  }
}
