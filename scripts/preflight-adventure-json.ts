/**
 * Check an adventure-json/v1 file offline with the same validator import uses.
 *
 *   bun scripts/preflight-adventure-json.ts <adventure.json> [--json] [--repair-prompt]
 *
 * Never writes files. Exit codes: 0 valid, 1 invalid, 2 bad arguments or unreadable file.
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  buildAdventureRepairPrompt,
  formatAdventurePreflightText,
  preflightAdventureJson,
} from "../packages/adventure-engine/src/adventure-json/preflight";

const usage =
  "Usage: bun scripts/preflight-adventure-json.ts <adventure.json> [--json] [--repair-prompt]";

let values: { json: boolean; "repair-prompt": boolean };
let positionals: string[];
try {
  const parsedArgs = parseArgs({
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      "repair-prompt": { type: "boolean", default: false },
    },
  });
  values = parsedArgs.values as typeof values;
  positionals = parsedArgs.positionals;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid arguments");
  console.error(usage);
  process.exit(2);
}

if (positionals.length !== 1) {
  console.error(usage);
  process.exit(2);
}

const filePath = positionals[0] as string;

let bytes: Uint8Array;
try {
  bytes = readFileSync(filePath);
} catch {
  console.error(`Cannot read file: ${filePath}`);
  process.exit(2);
}

const report = preflightAdventureJson(bytes);
const repairPrompt = values["repair-prompt"]
  ? buildAdventureRepairPrompt(report)
  : null;

if (values.json) {
  console.log(
    JSON.stringify(
      repairPrompt === null ? report : { ...report, repairPrompt },
      null,
      2,
    ),
  );
} else {
  console.log(formatAdventurePreflightText(report));
  if (repairPrompt !== null) {
    console.log("\n--- REPAIR PROMPT START ---");
    console.log(repairPrompt);
    console.log("--- REPAIR PROMPT END ---");
  }
}

process.exit(report.status === "valid" ? 0 : 1);
