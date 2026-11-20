import {
  validateAdventureJson,
  type AdventureJsonValidationErrorCode,
} from "./validator";

export type AdventurePreflightCode =
  AdventureJsonValidationErrorCode | "JSON_PARSE_ERROR";

export type AdventurePreflightCategory = "parse" | "schema" | "integrity";

export interface AdventurePreflightFinding {
  category: AdventurePreflightCategory;
  code: AdventurePreflightCode;
  message: string;
  path?: string;
  entityId?: string;
  hint: string;
}

export interface AdventurePreflightReport {
  status: "valid" | "invalid";
  sourceFidelity: "not-checked";
  findings: AdventurePreflightFinding[];
}

export const ADVENTURE_PREFLIGHT_SOURCE_FIDELITY_LINE =
  "Source fidelity: not checked (preflight checks structure and references only, not whether the conversion is complete or faithful to the source).";

export const ADVENTURE_PREFLIGHT_HINTS: Record<AdventurePreflightCode, string> =
  {
    JSON_PARSE_ERROR:
      "Make the file well-formed UTF-8 JSON, for example by restoring a truncated ending.",
    SCHEMA_VALIDATION_ERROR:
      "Change the field at this path to match the adventure-json/v1 schema.",
    INVALID_FORMAT_VERSION: 'Set formatVersion to "adventure-json/v1".',
    INVALID_VISIBILITY:
      "Use a visibility value the schema allows; secrets must be gm-only.",
    DUPLICATE_ID: "Give each record in the package a unique id.",
    UNRESOLVED_REFERENCE:
      "Point this field at the id of an existing record of the expected kind.",
    SELF_REFERENCE: "Remove the reference from this record to itself.",
    HIERARCHY_CYCLE: "Break the parent chain so no record is its own ancestor.",
    DEAD_END_CYCLE:
      "Add the exit branch the source states, or mark a branch optional only if the source says it can be skipped; an unresolved entry does not clear this error.",
    UNREACHABLE_SCENE:
      "Connect the scene by a branch only if the source states it; otherwise add an UNKNOWN_SCENE_PROGRESSION unresolved entry for it and do not invent a branch.",
    DUPLICATE_SCENE_PROGRESSION:
      "Keep one UNKNOWN_SCENE_PROGRESSION unresolved entry per scene and remove the extra.",
  };

const SCHEMA_CODES: ReadonlySet<AdventurePreflightCode> = new Set([
  "SCHEMA_VALIDATION_ERROR",
  "INVALID_FORMAT_VERSION",
  "INVALID_VISIBILITY",
]);

function categoryOf(code: AdventurePreflightCode): AdventurePreflightCategory {
  if (code === "JSON_PARSE_ERROR") return "parse";
  return SCHEMA_CODES.has(code) ? "schema" : "integrity";
}

function parseFinding(message: string): AdventurePreflightReport {
  return {
    status: "invalid",
    sourceFidelity: "not-checked",
    findings: [
      {
        category: "parse",
        code: "JSON_PARSE_ERROR",
        message,
        hint: ADVENTURE_PREFLIGHT_HINTS.JSON_PARSE_ERROR,
      },
    ],
  };
}

export function preflightAdventureJson(
  input: string | Uint8Array,
): AdventurePreflightReport {
  let text: string;
  if (typeof input === "string") {
    text = input;
  } else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(input);
    } catch {
      return parseFinding("File is not valid UTF-8.");
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : ".";
    return parseFinding(`File is not valid JSON${detail}`);
  }

  const result = validateAdventureJson(parsed);
  if (result.ok) {
    return { status: "valid", sourceFidelity: "not-checked", findings: [] };
  }
  return {
    status: "invalid",
    sourceFidelity: "not-checked",
    findings: result.errors.map((error) => ({
      category: categoryOf(error.code),
      code: error.code,
      message: error.message,
      ...(error.path === undefined ? {} : { path: error.path }),
      ...(error.entityId === undefined ? {} : { entityId: error.entityId }),
      hint: ADVENTURE_PREFLIGHT_HINTS[error.code],
    })),
  };
}

export function formatAdventurePreflightText(
  report: AdventurePreflightReport,
): string {
  const lines: string[] = [];
  if (report.status === "valid") {
    lines.push("Preflight: passed structural and reference validation.");
  } else {
    lines.push("Preflight: invalid.");
    for (const finding of report.findings) {
      lines.push(
        `- [${finding.category}] ${finding.code} at ${finding.path ?? "(root)"}${
          finding.entityId === undefined ? "" : ` (entity ${finding.entityId})`
        }`,
        `    ${finding.message}`,
        `    Hint: ${finding.hint}`,
      );
    }
    lines.push(`Summary: ${report.findings.length} finding(s).`);
  }
  lines.push(ADVENTURE_PREFLIGHT_SOURCE_FIDELITY_LINE);
  return lines.join("\n");
}

export function buildAdventureRepairPrompt(
  report: AdventurePreflightReport,
): string | null {
  if (report.status === "valid") return null;
  const lines = [
    "The Adventure JSON (adventure-json/v1) file you were given failed validation. Fix only the errors listed here.",
    "",
    "Rules:",
    "- Fix only the listed errors.",
    "- Keep the package id, version, source facts, sourceRefs, every entity ID and all unaffected fields exactly as they are, except where a listed error names one that must change. Do not bump version.",
    "- Do not invent replacement content.",
    "- Return the complete corrected Adventure JSON object.",
    "- Run validation again after the fix.",
    "- Source fidelity was not checked and is not part of this repair.",
    "",
    "Errors:",
  ];
  report.findings.forEach((finding, index) => {
    lines.push(
      `${index + 1}. category: ${finding.category}; code: ${finding.code}; path: ${finding.path ?? "(root)"}${
        finding.entityId === undefined ? "" : `; entity ID: ${finding.entityId}`
      }; message: ${finding.message}`,
    );
  });
  if (report.findings.some((finding) => finding.category === "parse")) {
    lines.push(
      "",
      "The file is not well-formed JSON. Return well-formed JSON with nothing else changed.",
    );
  }
  return lines.join("\n");
}
