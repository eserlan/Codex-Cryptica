/**
 * Staged conversion for long adventures (#4896).
 *
 * Everything here runs in the user's own AI assistant and machine. Codex
 * Cryptica never receives the source and adds no schema requirement: each
 * stage works inside the canonical Adventure JSON v1 rules.
 */

export const STAGED_ANCHOR = "long-adventures";

export const STAGED_INVENTORY_PROMPT = `Stage 1 of 3: inventory only. Do not convert anything yet.

Read the adventure I attached and list its parts so I can convert it in separate passes.

Reply with:
1. The total page count you can actually see, and any pages you cannot read or that look scanned, blank or garbled (list page numbers).
2. A numbered list of sections in source order. For each: a short title, the page range, what it holds (scenes, locations or keyed rooms, cast, items, appendix, other), and a short id prefix such as "town-", "caves-" or "cast-". Keep each part small enough to convert in one reply (about 10 pages or fewer); split big chapters.
3. The names of the main recurring characters, factions and places that appear in more than one section, each with the single id you will use for it everywhere (for example "actor-reeve-tomas").

Do not summarise the story, do not write any Adventure JSON, and do not claim a part is covered unless you can see its pages. If you cannot read the document at all, say so in one sentence instead of guessing from the title.`;

export const STAGED_CHUNK_PROMPT = `Stage 2 of 3: convert one section. Use the Adventure JSON v1 conversion prompt I gave you earlier and follow all of its rules, with these changes for this pass only.

Convert only this section of the source: [PASTE THE SECTION TITLE AND PAGE RANGE FROM THE INVENTORY HERE]

- Produce a complete Adventure JSON v1 document that contains only entries from this section. Repeat the same "formatVersion", "id", "title", "version", "premise" and "source" in every pass, and keep all 11 collection arrays (use [] when empty).
- Use exactly the ids from the inventory for recurring characters, factions and places. Give new entries ids that start with this section's id prefix. An entry that appears in several sections keeps one id everywhere.
- You may refer to an id defined in another section (for example a clue placed with a character from section 1), but do not define or invent that entry here.
- Add "sourceRef" with the page number to every entry.
- Never invent anything to connect this section to others. Record gaps in "unresolved".
- Deliver the JSON as a file named after the section, such as "chunk-02.json" (or as the whole reply if you cannot create files). After it, add a short plain-text completion record: the section and pages, the number of entries per collection, the ids you referred to but did not define, and anything you could not read or left out. If you could not finish this section, say so instead of presenting it as complete.`;

export const STAGED_COVERAGE_PROMPT = `Stage 3 of 3: check coverage. Do not convert anything new.

Below are my inventory and the completion record for every section I converted. Compare them and reply with:
1. A table with one row per inventory section: "converted", "partly converted" (say what is missing) or "not converted", based only on the completion records.
2. Every id that a section referred to but no section defined, and which section it is expected in.
3. Any recurring character, faction or place that was given more than one id.
4. Any page range in the inventory that no completion record covers.

Do not assume a section is done because it is listed. If a record is missing or vague, mark that section "not converted". Do not write Adventure JSON.

[PASTE THE INVENTORY, THEN EACH COMPLETION RECORD]`;

/**
 * Pure JavaScript, no dependencies. Shown on the guide and run in tests, so
 * what users copy is what is verified. It merges chunk documents without
 * inventing anything: a conflicting duplicate id is reported, never resolved.
 */
export const STAGED_ASSEMBLE_FUNCTION = `function assemble(chunks) {
  const names = ["locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved"];
  const first = chunks[0];
  const out = {};
  for (const key of ["formatVersion", "id", "title", "version", "description", "premise", "source", "system"]) {
    if (first[key] !== undefined) out[key] = first[key];
  }
  for (const name of names) out[name] = [];
  const errors = [];
  const seen = new Map();
  chunks.forEach((chunk, index) => {
    for (const key of ["formatVersion", "id", "title", "version"]) {
      if (chunk[key] !== first[key]) errors.push("chunk " + (index + 1) + ": " + key + " differs from chunk 1");
    }
    for (const name of names) {
      for (const entry of chunk[name] || []) {
        const before = seen.get(entry.id);
        if (!before) {
          seen.set(entry.id, entry);
          out[name].push(entry);
        } else if (JSON.stringify(before) !== JSON.stringify(entry)) {
          errors.push('chunk ' + (index + 1) + ': id "' + entry.id + '" is defined differently elsewhere');
        }
      }
    }
  });
  return { adventure: out, errors };
}`;

export const STAGED_ASSEMBLE_SCRIPT = `// assemble.js: node assemble.js chunk-01.json chunk-02.json > adventure.json
${STAGED_ASSEMBLE_FUNCTION}

const fs = require("fs");
const chunks = process.argv.slice(2).map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const { adventure, errors } = assemble(chunks);
if (errors.length > 0) {
  console.error(errors.join("\\n"));
  process.exit(1);
}
console.log(JSON.stringify(adventure, null, 2));`;

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
    fix: "Use smaller sections in Stage 1 (about 10 pages), and start a fresh chat for each pass so earlier text does not crowd out the section.",
  },
  {
    problem: "The output is too large",
    signs:
      "The JSON stops mid-way, has no closing brace, or the assistant replies that it shortened the result.",
    fix: "Convert smaller sections, one file per section. Never ask it to continue a cut-off JSON reply: redo that section in two.",
  },
];
