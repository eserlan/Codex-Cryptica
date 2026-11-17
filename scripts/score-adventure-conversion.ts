/**
 * Score an adventure-json/v1 conversion against an answer key, offline.
 *
 *   bun scripts/score-adventure-conversion.ts <conversion.json> <answer-key.json> [--repairs N] [--json]
 *
 * Exit codes: 0 overall pass, 1 overall fail, 2 bad arguments or bad key file.
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  CONVERSION_SCORE_DIMENSIONS,
  ConversionAnswerKeySchema,
  scoreAdventureConversion,
} from "../packages/adventure-engine/src/adventure-json/conversion-score";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    repairs: { type: "string" },
    json: { type: "boolean", default: false },
  },
});

if (positionals.length !== 2) {
  console.error(
    "Usage: bun scripts/score-adventure-conversion.ts <conversion.json> <answer-key.json> [--repairs N] [--json]",
  );
  process.exit(2);
}

const [conversionPath, keyPath] = positionals as [string, string];

let repairIterations: number | undefined;
if (values.repairs !== undefined) {
  const parsed = Number(values.repairs);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error("--repairs must be a non-negative integer");
    process.exit(2);
  }
  repairIterations = parsed;
}

let doc: unknown;
let keyRaw: unknown;
try {
  doc = JSON.parse(readFileSync(conversionPath, "utf8"));
} catch {
  console.error(`Cannot read conversion file: ${conversionPath}`);
  process.exit(2);
}

try {
  keyRaw = JSON.parse(readFileSync(keyPath, "utf8"));
} catch {
  console.error(`Cannot read answer key file: ${keyPath}`);
  process.exit(2);
}

const parsedKey = ConversionAnswerKeySchema.safeParse(keyRaw);
if (!parsedKey.success) {
  console.error(
    `Invalid answer key: ${parsedKey.error.issues.map((i) => i.message).join("; ")}`,
  );
  process.exit(2);
}

const result = scoreAdventureConversion(doc, parsedKey.data, {
  ...(repairIterations === undefined ? {} : { repairIterations }),
});

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Overall: ${result.overall}`);
  console.log(`Repair iterations: ${result.repairIterations}`);
  for (const name of CONVERSION_SCORE_DIMENSIONS) {
    const dim = result.dimensions[name];
    console.log(`${name}: ${dim.status}`);
    for (const detail of dim.details) console.log(`  - ${detail}`);
  }
}

process.exit(result.overall === "pass" ? 0 : 1);
