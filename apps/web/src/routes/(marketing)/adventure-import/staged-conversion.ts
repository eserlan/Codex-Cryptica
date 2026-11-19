/**
 * Staged conversion for long adventures (#4896).
 *
 * Conversion uses the user's chosen assistant (hosted or local). Codex
 * Cryptica does not handle the source during conversion and adds no schema
 * requirement: each stage follows the canonical Adventure JSON v1 rules.
 */

export const STAGED_ANCHOR = "long-adventures";

/** Defined here so the staged prompts can use them without a circular import. */
export const PROMPT_END_MARKER = "END OF ADVENTURE JSON V1 CONVERSION PROMPT";

export const PROMPT_TXT_URL =
  "https://codexcryptica.com/adventure-import/prompt.txt";

export const AUTOMATIC_STAGING_RULES = `Automatic staging when the full conversion will not fit:
1. Before generating JSON, inspect the source and make a numbered inventory of all visible sections and their source ranges. For paginated sources, record physical page ranges and flag unreadable or unseen pages separately. For sources without pagination, use headings, anchors or another stable source range; never invent page numbers. Split dense sections into small, non-overlapping chunks. If a page or source range has two sections, say which part each chunk owns. List every expected source-supported entry by collection with its name and planned ID, and mark the section that defines it. Write the exact top-level metadata values in the checkpoint, including the player-safe premise. Reuse them unchanged in every chunk. Assign one ID and defining chunk per shared entity.
2. Convert in source order. Each chunk is a separate JSON object with the same top-level metadata and all 11 arrays. Name files chunk-01.json, chunk-02.json, and so on. Define each entry only in its owning chunk. References to other known chunk IDs may remain pending until assembly. Before marking a chunk complete, compare its actual JSON IDs and per-collection counts with the expected IDs and counts for that section in the inventory; list every missing or unexpected ID and any count mismatch, and do not mark the chunk complete while any discrepancy remains unexplained. Record every completed chunk and any omitted material. Never present an unfinished chunk as complete. If a chunk is too large, split it and retry from the start.
3. If you can create files and keep working within the available limits, save the inventory and proceed with the chunks now. Otherwise return the inventory and checkpoint as plain text, with the next chunk's name and source range and the exact instruction "Continue with chunk 01" (use the actual next number). On continuation in the same chat, use the existing checkpoint and convert only the requested chunk. A pass in a new chat needs the full canonical prompt, the checkpoint or inventory with its locked package metadata, and the source for that one section; if any of these is missing, name what is missing and do not convert. "Continue" alone is not enough. Deliver one chunk as raw JSON if you cannot create files. Keep progress notes in separate messages or files, never in the JSON. Ask only for a source range or checkpoint you no longer have.
4. Assemble only after every planned chunk is present, each section's expected IDs and per-collection counts have been compared with its actual chunk JSON, coverage has been checked against the source, and shared metadata and IDs agree. Resolve references against the combined package. If you can run the v1 schema and semantic validator, validate before calling the file ready. Otherwise label the result unvalidated and ask the user to check it in Codex Cryptica. If you cannot assemble reliably, list the saved chunks and point to the assembler at https://codexcryptica.com/adventure-import#long-adventures. Never label an inventory, partial chunk set, or truncated reply as the final adventure.`;

export const STAGED_INVENTORY_PROMPT = `Stage 1 of 3: inventory only. Do not convert anything yet.

Read the adventure I attached and list its parts so I can convert it in separate passes.

Reply with:
1. If the source is paginated, give the total page count you can actually see and list any pages you cannot read or that look scanned, blank or garbled. If printed page numbers differ from file positions, say so and use the position in the file from now on. If it is not paginated, say that and do not invent page numbers.
2. A numbered list of sections in source order. For each: a short title, the page range for paginated sources or a heading/anchor/source range otherwise, what it holds (scenes, locations or keyed rooms, cast, items, appendix, other), and a short id prefix such as "town-", "caves-" or "cast-". Keep each part small enough to convert in one reply (about 10 pages or a similarly small text section); split big chapters. Sections must not overlap: if a page or source range is shared, say which section owns each part of it.
3. A checklist of every expected source-supported entry, grouped by Adventure JSON collection. Give each a short source name and planned ID, and identify its defining section. Include distinct clues, rumours, encounters, items and endings, not only sections or recurring entities. Do not add entries unsupported by the source.
4. The names of the main recurring characters, factions and places that appear in more than one section, each with the single ID you will use everywhere, and the one section that describes each in detail and so defines it. Other sections only refer to it.
5. A clearly labelled block titled "Locked package metadata". Fix once the exact values of "formatVersion", "id", "title", "version", "premise" and "source", plus "description" and "system" when present. Every later pass, in the same chat or a new one, copies these values word for word.

Do not summarise the story, do not write any Adventure JSON, and do not claim a part is covered unless you can see its source material. If you cannot read the source at all, say so in one sentence instead of guessing from the title.`;

const STAGED_STOP_RULE = `Before converting, check that this chat holds all three of: the complete canonical conversion prompt (ending with the standalone line "${PROMPT_END_MARKER}"), the Stage 1 inventory with its locked package metadata, and the source pages or text for this section. If any is missing, do not convert. Reply only with a short plain list naming each missing item and ask me to provide it. A "continue" request does not count as having that context, and you must not invent entries or ids to fill the gap.`;

const STAGED_SECTION_RULES = `- Produce a complete Adventure JSON v1 document that contains only entries from this section. Copy the "formatVersion", "id", "title", "version", "premise" and "source" word for word from the inventory's "Locked package metadata" block in every pass, plus identical "description", "system" and top-level "extensions" when present. If the same adventure has a correspondence mapping, supply the full mapping unchanged in every chunk. Keep all 11 collection arrays (use [] when empty).
- Use exactly the ids from the inventory for recurring characters, factions and places. Give new entries ids that start with this section's id prefix. An entry that appears in several sections keeps one id everywhere.
- You may refer to an id defined in another section (for example a clue placed with a character from section 1), but define an entry only if the inventory says this section defines it. Never invent an entry that belongs to another section.
- Add a "sourceRef" to every entry where the source location is known. For paginated sources, add "sourceRef" with the page number (and pageEnd when needed), using the page position in the file, not any number printed on the page. For unpaginated sources, use the supported section or anchor reference; never invent a page number.
- Never invent anything to connect this section to others. Record gaps in "unresolved".
- Deliver valid JSON only in a file named after the section, such as "chunk-02.json". If you cannot create files, make the entire reply the JSON document only: no Markdown fences, commentary or completion record. After delivering the file, provide the plain-text completion record as a separate message; if you had to reply with JSON, wait until I ask "completion record" before sending that separate message. The completion record must list the section and source range, IDs actually present in each collection, number of entries per collection, ids you referred to but did not define, and anything unreadable or omitted. If you could not finish this section, say so in the completion record instead of presenting it as complete.`;

export const STAGED_CHUNK_PROMPT = `Stage 2 of 3: convert one section, in the same chat. Use the Adventure JSON v1 conversion prompt I gave you earlier and follow all of its rules, with these changes for this pass only.

${STAGED_STOP_RULE}

Convert only this section of the source: [PASTE THE SECTION TITLE AND PAGE RANGE, HEADING, ANCHOR OR OTHER SOURCE RANGE FROM THE INVENTORY HERE]

${STAGED_SECTION_RULES}`;

export const STAGED_NEW_CHAT_PROMPT = `Stage 2 of 3: convert one section, in a new chat. This chat has no other context, so I will give you everything you need. I will paste or attach four things, in this order:
1. The full Adventure JSON v1 conversion prompt, or the link ${PROMPT_TXT_URL} if you can open it. The complete prompt ends with the standalone line "${PROMPT_END_MARKER}".
2. The Stage 1 inventory, including the locked package metadata, the section list with id prefixes and the recurring-entity ids.
3. The source pages or text for this one section.
4. These Stage 2 instructions for that section.

Follow all of the conversion prompt's rules, with these changes for this pass only.

${STAGED_STOP_RULE}

Convert only this section of the source: [PASTE THE SECTION TITLE AND PAGE RANGE, HEADING, ANCHOR OR OTHER SOURCE RANGE FROM THE INVENTORY HERE]

${STAGED_SECTION_RULES}`;

export const STAGED_COVERAGE_PROMPT = `Stage 3 of 3: check coverage. Do not convert anything new.

Below are my inventory, the JSON files for every chunk, and the completion record for every section I converted. Compare the expected-entry checklist with the actual IDs and counts in the chunk JSON; use completion records only for unreadable or omitted material, not as proof that an entry exists. Reply with:
1. A table with one row per inventory section: "converted", "partly converted" (name missing expected entries) or "not converted". Mark a section converted only when every expected ID assigned to it appears in the corresponding chunk JSON and its reported collection counts match that JSON.
2. Every expected ID missing from the chunk JSON, every unexpected ID, and any collection count mismatch, with its expected section where known.
3. Every id that a section referred to but no section defined, and which section it is expected in.
4. Any recurring character, faction or place that was given more than one id.
5. Any page range or unpaginated source range in the inventory that no chunk covers.

Do not assume a section is done because it is listed. If a record is missing or vague, mark that section "not converted". Do not write Adventure JSON.

[PASTE THE INVENTORY, THEN EACH CHUNK JSON FILE, THEN EACH COMPLETION RECORD]`;

/**
 * Pure JavaScript, no dependencies. Shown on the guide and run in tests, so
 * what users copy is what is verified. It merges chunk documents without
 * inventing anything: a conflicting duplicate id is reported, never resolved.
 */
export const STAGED_ASSEMBLE_FUNCTION = `function stableJson(value) {
  return JSON.stringify(value, (_key, entry) =>
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]]))
      : entry,
  );
}

function assemble(chunks) {
  const names = ["locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved"];
  const metadataKeys = ["formatVersion", "id", "title", "version", "description", "premise", "source", "system", "extensions"];
  const first = chunks[0];
  const out = {};
  for (const key of metadataKeys) {
    if (first[key] !== undefined) out[key] = first[key];
  }
  for (const name of names) out[name] = [];
  const errors = [];
  const seen = new Map();
  chunks.forEach((chunk, index) => {
    for (const key of metadataKeys) {
      if (stableJson(chunk[key]) !== stableJson(first[key])) {
        errors.push("chunk " + (index + 1) + ": " + key + " differs from chunk 1");
      }
    }
    for (const name of names) {
      for (const entry of chunk[name] || []) {
        const before = seen.get(entry.id);
        if (!before) {
          seen.set(entry.id, entry);
          out[name].push(entry);
        } else if (stableJson(before) !== stableJson(entry)) {
          errors.push('chunk ' + (index + 1) + ': id "' + entry.id + '" is defined differently elsewhere');
        }
      }
    }
  });
  return { adventure: out, errors };
}`;

export const STAGED_ASSEMBLE_SCRIPT = `// assemble.js: node assemble.js chunk-01.json chunk-02.json
// Writes adventure.json only after every input and consistency check succeeds.
${STAGED_ASSEMBLE_FUNCTION}

const fs = require("fs");
const path = require("path");
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node assemble.js chunk-01.json [chunk-02.json ...]");
  process.exit(1);
}
const chunks = files.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const { adventure, errors } = assemble(chunks);
if (errors.length > 0) {
  console.error(errors.join("\\n"));
  process.exit(1);
}
const output = path.resolve("adventure.json");
const temporary = path.join(path.dirname(output), "." + path.basename(output) + "." + process.pid + "." + Date.now() + ".tmp");
try {
  fs.writeFileSync(temporary, JSON.stringify(adventure, null, 2) + "\\n", { flag: "wx" });
  fs.renameSync(temporary, output);
  console.log("Wrote " + output);
} catch (error) {
  try { fs.unlinkSync(temporary); } catch { /* Nothing to clean up. */ }
  throw error;
}`;

export interface StagedFailureMode {
  problem: string;
  signs: string;
  fix: string;
}

/** The three distinct ways a long conversion goes wrong, and what to do. */
export const STAGED_FAILURE_MODES: StagedFailureMode[] = [
  {
    problem: "The assistant cannot read the document",
    signs:
      "It answers from the title, cannot quote a line you name from page 10, ignores a link you gave it, or pages look scanned or garbled.",
    fix: "Ask it to quote the first line of a page you pick. If it cannot, give it the text instead: paste each section, or use an OCR'd copy. Do not continue with a source it cannot read.",
  },
  {
    problem: "The input is too large",
    signs:
      "Later chapters are missing or thinly covered, or it says it is summarising.",
    fix: "Use smaller sections in Stage 1 (about 10 pages). When you start a fresh chat for a pass, use the new-chat handoff: paste the canonical prompt, the inventory with its locked metadata, and that section's source.",
  },
  {
    problem: "The output is too large",
    signs:
      "The JSON stops mid-way, has no closing brace, or the assistant replies that it shortened the result.",
    fix: "Convert smaller sections, one file per section. Never ask it to continue a cut-off JSON reply: redo that section in two.",
  },
];
