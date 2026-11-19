/**
 * Staged conversion for long adventures (#4896).
 *
 * Conversion uses the user's chosen assistant (hosted or local). Codex
 * Cryptica does not handle the source during conversion and adds no schema
 * requirement: each stage follows the canonical Adventure JSON v1 rules.
 */

import { CANONICAL_ORIGIN } from "./canonical-origin.js";

export const STAGED_ANCHOR = "long-adventures";

export const AUTOMATIC_STAGING_RULES = `Automatic staging when the full conversion will not fit:
1. Before generating JSON, inspect the source and make a numbered inventory of all visible sections and their source ranges. For paginated sources, record physical page ranges and flag unreadable or unseen pages separately. For sources without pagination, use headings, anchors or another stable source range; never invent page numbers. Split dense sections into small, non-overlapping chunks. If a page or source range has two sections, say which part each chunk owns. List every expected source-supported entry by collection with its name and planned ID, and mark the section that defines it. Write the exact top-level metadata values in the checkpoint, including the player-safe premise. Reuse them unchanged in every chunk. Assign one ID and defining chunk per shared entity.
2. Convert in source order. Each chunk is a separate JSON object with the same top-level metadata and all 11 arrays. Name files chunk-01.json, chunk-02.json, and so on. Define each entry only in its owning chunk. References to other known chunk IDs may remain pending until assembly. Before marking a chunk complete, compare its actual JSON IDs and per-collection counts with the expected IDs and counts for that section in the inventory; list every missing or unexpected ID and any count mismatch, and do not mark the chunk complete while any discrepancy remains unexplained. Record every completed chunk and any omitted material. Never present an unfinished chunk as complete. If a chunk is too large, split it and retry from the start.
3. If you can create files and keep working within the available limits, save the inventory and proceed with the chunks now. Otherwise return the inventory and checkpoint as plain text, with the next chunk's name and source range and the exact instruction "Continue with chunk 01" (use the actual next number). On continuation, use the existing checkpoint and convert only the requested chunk. Deliver one chunk as raw JSON if you cannot create files. Keep progress notes in separate messages or files, never in the JSON. Ask only for a source range or checkpoint you no longer have.
4. Assemble only after every planned chunk is present, each section's expected IDs and per-collection counts have been compared with its actual chunk JSON, coverage has been checked against the source, and shared metadata and IDs agree. Resolve references against the combined package. If you can run the v1 schema and semantic validator, validate before calling the file ready. Otherwise label the result unvalidated and ask the user to check it in Codex Cryptica. If you cannot assemble reliably, list the saved chunks and point to the assembler at ${CANONICAL_ORIGIN}/adventure-import#${STAGED_ANCHOR}. Never label an inventory, partial chunk set, or truncated reply as the final adventure.`;

export const STAGED_INVENTORY_PROMPT = `Stage 1 of 3: inventory only. Do not convert anything yet.

Read the adventure I attached and list its parts so I can convert it in separate passes. Reply with one checkpoint manifest, as JSON only, in the format at https://codexcryptica.com/schemas/adventure-checkpoint/v1.json. It is a separate checkpoint file, not Adventure JSON. Set "kind" to "codex-cryptica.adventure-checkpoint", "manifestVersion" to 1 and "status" to "partial". Fill in:
1. "metadata": the exact top-level values every chunk will repeat, taken from the source: "formatVersion", "id", "title", "version", "premise" (player-safe background and hook) and "source". Add "description", "system" or "extensions" only when the source supports them.
2. "source": the file name and "pageCount", the total page count you can actually see (null if the source is not paginated; do not invent page numbers). List pages you cannot read or that look scanned, blank or garbled in "unreadable" (or by anchor for unpaginated sources). If printed page numbers differ from file positions, use the position in the file from now on.
3. "sections", in source order. For each: a "key" such as "s01", a short "title", "pages" ({ "from", "to" }) for paginated sources or an "anchor" (heading or source range) otherwise, an "idPrefix" such as "town-", a "chunkFile" such as "chunk-01.json", "owns" and "expectedCounts" (the number of owned entries per collection). Keep each part small enough to convert in one reply (about 10 pages or a similarly small text section); split big chapters. Sections must not overlap: if a page or source range is shared, say which section owns each part of it.
4. In each section's "owns", every expected source-supported entry as { "id", "collection", "page" } (or "anchor" for unpaginated sources) with a short planned id. Every owned id must carry its page or anchor. Include distinct clues, rumours, encounters, items and endings, not only sections or recurring entities. Each entry has one defining section. Do not add entries unsupported by the source.
5. "sharedIds": the main recurring characters, factions and places that appear in more than one section, each with the single id you will use everywhere and the one section ("owner") that describes it in detail and so defines it. Other sections only refer to it.
6. Leave "completed", "pending" and "gaps" as empty arrays.

Do not summarise the story, do not write any Adventure JSON, and do not claim a part is covered unless you can see its source material. If you cannot read the source at all, say so in one sentence instead of guessing from the title.`;

const STAGED_COMPLETION_DELTA_INSTRUCTIONS = `Then, as a separate message, send a completion delta as JSON:
{
  "section": "[SECTION KEY]",
  "file": "[CHUNK FILE]",
  "counts": { "<collection>": <number of entries> },
  "pending": [{ "id": "<referenced id>", "referencedBy": "<id containing the reference>", "expectedIn": "<owning section key>" }],
  "gaps": [{ "section": "<section key>", "anchor": "<source range>", "note": "<what is missing>" }],
  "status": "complete" or "failed"
}
The counts are the entries actually in the chunk. In "pending", list every id referenced by this chunk but defined in a different section, using the manifest's owning section for "expectedIn". Do not list ids defined in this chunk. Each pending item must include "id", "referencedBy" and "expectedIn". Report unreadable, omitted or unclear source material in "gaps", using "pages" instead of "anchor" for a paginated source, and set status to "failed" if the section is incomplete. The delta is never a regenerated manifest: do not repeat the manifest's metadata, sections or sharedIds.`;

export const STAGED_CHUNK_PROMPT = `Stage 2 of 3: convert one section. Everything you need is in this message, in this order: the complete Adventure JSON v1 conversion prompt (ending with its end-marker line), then the checkpoint manifest JSON, then one section key.

Follow all of the conversion prompt's rules, with these changes for this pass only.

[PASTE THE COMPLETE CONVERSION PROMPT HERE]

[PASTE THE MANIFEST JSON HERE]

Section key: [PASTE ONE SECTION KEY, SUCH AS s02]

- The source adventure is attached; convert only from it, and say so if it is missing.
- Convert only the manifest section with that key, using its pages or anchor. Produce a complete Adventure JSON v1 document that contains only entries from this section, and keep all 11 collection arrays (use [] when empty).
- Copy "metadata" from the manifest unchanged into the top level of the document. Never reconstruct or rephrase it. If the manifest metadata has "extensions", copy them unchanged too.
- Define only the ids listed in this section's "owns". Use the manifest's ids for every reference, including references to ids another section owns. Never invent an entry that belongs to another section, and never invent anything to connect this section to others.
- Add a "sourceRef" to every entry where the source location is known. For paginated sources, add "sourceRef" with the page number (and pageEnd when needed), using the page position in the file, not any number printed on the page. For unpaginated sources, use the supported section or anchor reference; never invent a page number.
- Record anything unreadable, omitted or unclear in "unresolved".
- This pass overrides any automatic staging rule in the conversion prompt. If this section does not fit in one reply, do not start a new inventory: report "failed" in the completion delta below.
- Deliver the chunk as a file named after the manifest's "chunkFile", such as "chunk-02.json". If you cannot create files, make the entire reply the JSON document only: no Markdown fences or commentary.
${STAGED_COMPLETION_DELTA_INSTRUCTIONS}`;

/** Stage 2 instructions for a chat that already has the prompt, manifest and source. */
export const STAGED_SAME_CHAT_PROMPT = `Stage 2 of 3: convert one section in this chat.

Before converting, check that this chat contains the complete canonical Adventure JSON v1 conversion prompt (ending with its standalone end-marker line), the checkpoint manifest from Stage 1, and the source pages or text for this section. If any is missing, do not convert; list what is missing and ask me to provide it. "Continue" alone does not count as having that context.

Convert only the manifest section with this key: [PASTE ONE SECTION KEY, SUCH AS s02]. Follow the complete conversion prompt and the Stage 2 rules below. The source adventure is attached; say so if it is missing. Copy the manifest metadata unchanged, define only ids listed in that section's "owns", and keep all 11 collection arrays. Add sourceRef wherever known. Record unreadable, omitted or unclear material in "unresolved". If the section will not fit in one reply, do not start another inventory: report "failed" in the completion delta. Deliver the chunk as the manifest's chunkFile, as JSON only, never putting the delta in the chunk file.

${STAGED_COMPLETION_DELTA_INSTRUCTIONS}`;

/** A complete handoff for a new chat; no earlier conversation is assumed. */
export const STAGED_NEW_CHAT_PROMPT = `Stage 2 of 3: convert one section in a new chat. This chat has no earlier context. I will provide these four things in order:
1. The complete Adventure JSON v1 conversion prompt (or ${CANONICAL_ORIGIN}/adventure-import/prompt.txt if you can open it). It must end with its standalone end-marker line.
2. The checkpoint manifest JSON from Stage 1. It is a separate checkpoint file, not Adventure JSON.
3. The source pages or text for this one section.
4. This Stage 2 prompt with the section key below filled in.

Section key: [PASTE ONE SECTION KEY, SUCH AS s02]

Before converting, check that all four items are present and that the complete conversion prompt has its end-marker line. If anything is missing, do not convert; list what is missing and ask me to provide it. "Continue" alone does not count as having that context.

Follow all rules in the complete conversion prompt. Convert only the manifest section with the key above. Copy its metadata unchanged, define only ids listed in that section's "owns", and keep all 11 collection arrays. Add sourceRef wherever known. Record unreadable, omitted or unclear material in "unresolved". If the section will not fit in one reply, do not start another inventory: report "failed" in the completion delta. Deliver the chunk as the manifest's chunkFile, as JSON only, never putting the delta in the chunk file.

${STAGED_COMPLETION_DELTA_INSTRUCTIONS}`;

export const STAGED_COVERAGE_INTRO =
  "Paste the checkpoint manifest with every completion delta merged in, then every chunk JSON file. A completion delta (or a pass saying it is done) does not prove an entry was included: only the chunk JSON does. The check works from the real chunk files. This finds missing sections, ids that were referred to but never defined, and duplicate ids for the same character. For the exact check, run the check script below.";

export const STAGED_COVERAGE_PROMPT = `Stage 3 of 3: check coverage. Do not convert anything new.

Below are my checkpoint manifest, with every completion delta merged in, and the JSON file for every chunk. Compare the manifest with the actual JSON in each chunk file. Do not rely on completion deltas or any record of what a pass says it did: they are not proof that an entry exists. For the exact, repeatable check, run the check script on this page: node check.js manifest.json chunk-01.json chunk-02.json (adding all your chunk files). Reply with:
1. A table with one row per manifest section: "converted", "partly converted" (name missing owned ids) or "not converted". Mark a section converted only when every id in its "owns" appears in its chunk JSON and its per-collection counts match "expectedCounts".
2. Every owned id missing from the chunk JSON, every id a chunk defines that its section does not own, and any collection count mismatch.
3. Every id in "pending" that no chunk defines, and which section it is expected in.
4. Any recurring character, faction or place that was given more than one id.
5. Any page range or unpaginated source range that no section covers and that is not listed as unreadable.
6. Any chunk whose top-level metadata differs from the manifest's "metadata".

Do not assume a section is done because it is listed. If a chunk file is missing or vague, mark that section "not converted". Do not write Adventure JSON.

[PASTE THE MANIFEST, THEN EACH CHUNK JSON FILE]`;

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

/**
 * Pure JavaScript, no dependencies, like the assemble function. It checks the
 * real chunk files against the checkpoint manifest and never trusts a delta.
 */
export const STAGED_CHECK_FUNCTION = `function stableJson(value) {
  return JSON.stringify(value, (_key, entry) =>
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]]))
      : entry,
  );
}

function checkStagedChunks(manifest, chunks) {
  const names = ["locations", "actors", "factions", "scenes", "encounters", "clues", "rumours", "items", "secrets", "endings", "unresolved"];
  const required = ["formatVersion", "id", "title", "version", "premise", "source"];
  const optional = ["description", "system", "extensions"];
  const problems = [];
  const add = (kind, message) => problems.push({ kind, message });
  const quoted = (value) => JSON.stringify(String(value));
  const result = () => ({ ok: problems.length === 0, problems });
  if (!manifest || manifest.kind !== "codex-cryptica.adventure-checkpoint" || manifest.manifestVersion !== 1) {
    add("invalid-manifest", 'The manifest needs kind "codex-cryptica.adventure-checkpoint" and manifestVersion 1.');
    return result();
  }
  const metadata = manifest.metadata || {};
  const sections = manifest.sections || [];
  for (const key of required) {
    if (metadata[key] === undefined) add("metadata-missing", "manifest metadata is missing " + key);
  }

  const owner = new Map();
  for (const section of sections) {
    for (const entry of section.owns || []) {
      if (owner.has(entry.id) && owner.get(entry.id) !== section.key) {
        add("duplicate-owner", "id " + quoted(entry.id) + " is owned by both " + quoted(owner.get(entry.id)) + " and " + quoted(section.key));
      } else {
        owner.set(entry.id, section.key);
      }
    }
  }
  for (const shared of manifest.sharedIds || []) {
    if (owner.get(shared.id) !== shared.owner) {
      add("duplicate-owner", "shared id " + quoted(shared.id) + " says owner " + quoted(shared.owner) + " but sections own it as " + quoted(owner.get(shared.id) || "nobody"));
    }
  }

  const known = new Set(sections.map((section) => section.chunkFile));
  const byFile = new Map();
  for (const chunk of chunks) {
    if (!known.has(chunk.file)) add("unknown-chunk", quoted(chunk.file) + " matches no section in the manifest");
    else byFile.set(chunk.file, chunk.json);
    if (chunk.json && ("kind" in chunk.json || "manifestVersion" in chunk.json)) {
      add("manifest-in-chunk", quoted(chunk.file) + " has a kind or manifestVersion property; it looks like a manifest");
    }
  }

  const defined = new Set();
  for (const section of sections) {
    const json = byFile.get(section.chunkFile);
    if (!json) {
      add("missing-chunk", quoted(section.key) + ": " + quoted(section.chunkFile) + " was not supplied");
      continue;
    }
    for (const key of required.concat(optional)) {
      if (metadata[key] === undefined) {
        if (optional.includes(key) && json[key] !== undefined) {
          add("metadata-mismatch", quoted(section.chunkFile) + ": " + key + " is not in the manifest metadata");
        }
      } else if (json[key] === undefined) {
        add("metadata-missing", quoted(section.chunkFile) + ": " + key + " is missing");
      } else if (stableJson(json[key]) !== stableJson(metadata[key])) {
        add("metadata-mismatch", quoted(section.chunkFile) + ": " + key + " differs from the manifest");
      }
    }
    const owned = new Set((section.owns || []).map((entry) => entry.id));
    const present = new Set();
    for (const name of names) {
      if (name === "unresolved") continue;
      const entries = json[name] || [];
      for (const entry of entries) {
        present.add(entry.id);
        defined.add(entry.id);
        if (!owned.has(entry.id)) add("unowned-definition", quoted(section.chunkFile) + " defines " + quoted(entry.id) + ", which " + quoted(section.key) + " does not own");
      }
      const expected = (section.expectedCounts || {})[name] || 0;
      if (entries.length !== expected) {
        add("count-mismatch", quoted(section.chunkFile) + ": " + name + " has " + entries.length + ", expected " + expected);
      }
    }
    for (const id of owned) {
      if (!present.has(id)) add("missing-id", quoted(section.chunkFile) + " is missing owned id " + quoted(id));
    }

    if (typeof (manifest.source || {}).pageCount === "number") {
      const sectionRange = section.pages;
      if (!sectionRange) {
        add("missing-section-pages", "section " + quoted(section.key) + " has no page range for a paginated source");
      }
      for (const entry of section.owns || []) {
        if (!sectionRange || !Number.isInteger(entry.page) || entry.page < sectionRange.from || entry.page > sectionRange.to) {
          add("owned-page-out-of-section", "owned id " + quoted(entry.id) + " has page " + quoted(entry.page) + " outside " + quoted(section.key) + "'s section range");
        }
      }
    }
  }

  if (typeof (manifest.source || {}).pageCount === "number") {
    const pageCount = manifest.source.pageCount;
    const ranges = [];
    const addRange = (range, label) => {
      if (!Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 1 || range.to < range.from || range.to > pageCount) {
        add("invalid-page-range", label + " has a range outside 1..pageCount (" + pageCount + ") or with reversed endpoints");
        return;
      }
      ranges.push({ from: range.from, to: range.to });
    };
    for (const section of sections) if (section.pages) addRange(section.pages, "section " + quoted(section.key));
    for (const [index, range] of (manifest.source.unreadable || []).entries()) {
      if (range.from !== undefined) addRange(range, "unreadable range " + (index + 1));
    }
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    let nextPage = 1;
    for (const range of ranges) {
      if (range.from > nextPage) {
        const end = range.from - 1;
        add("uncovered-range", "pages " + nextPage + (end > nextPage ? "-" + end : "") + " are in no section and not listed as unreadable");
      }
      nextPage = Math.max(nextPage, range.to + 1);
    }
    if (nextPage <= pageCount) {
      add("uncovered-range", "pages " + nextPage + (pageCount > nextPage ? "-" + pageCount : "") + " are in no section and not listed as unreadable");
    }
  }

  for (const entry of manifest.pending || []) {
    if (!defined.has(entry.id)) add("pending-reference", "pending id " + quoted(entry.id) + " (from " + quoted(entry.referencedBy) + ", expected in " + quoted(entry.expectedIn) + ") is not defined by any supplied chunk");
  }
  return result();
}`;

export const STAGED_CHECK_SCRIPT = `// check.js: node check.js manifest.json chunk-01.json chunk-02.json
// Reads the files and reports problems. It writes no files.
${STAGED_CHECK_FUNCTION}

const fs = require("fs");
const path = require("path");
const [manifestFile, ...chunkFiles] = process.argv.slice(2);
if (!manifestFile) {
  console.error("Usage: node check.js manifest.json chunk-01.json [chunk-02.json ...]");
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const chunks = chunkFiles.map((file) => ({ file: path.basename(file), json: JSON.parse(fs.readFileSync(file, "utf8")) }));
const { ok, problems } = checkStagedChunks(manifest, chunks);
for (const problem of problems) console.error(problem.kind + ": " + problem.message);
if (!ok) process.exit(1);
console.log("Checkpoint check passed: " + chunks.length + " chunk file(s).");`;

export const STAGED_MANIFEST_EXAMPLE = `{
  "kind": "codex-cryptica.adventure-checkpoint",
  "manifestVersion": 1,
  "status": "partial",
  "metadata": {
    "formatVersion": "adventure-json/v1",
    "id": "long-sample",
    "title": "Long Sample",
    "version": "1.0.0",
    "premise": {
      "background": "A border town and a ridge tower.",
      "hook": "Find out why the beacon went dark."
    },
    "source": {
      "title": "Long Sample",
      "license": "CC0-1.0"
    }
  },
  "source": {
    "fileName": "long-sample.pdf",
    "pageCount": 80,
    "unreadable": []
  },
  "sections": [
    {
      "key": "s01",
      "title": "The Town",
      "pages": {
        "from": 1,
        "to": 40
      },
      "idPrefix": "town-",
      "chunkFile": "chunk-01.json",
      "owns": [
        {
          "id": "town-loc-square",
          "collection": "locations",
          "page": 3
        },
        {
          "id": "town-actor-reeve",
          "collection": "actors",
          "page": 5
        },
        {
          "id": "town-scene-meeting",
          "collection": "scenes",
          "page": 4
        }
      ],
      "expectedCounts": {
        "locations": 1,
        "actors": 1,
        "scenes": 1
      }
    },
    {
      "key": "s02",
      "title": "The Ridge",
      "pages": {
        "from": 41,
        "to": 80
      },
      "idPrefix": "ridge-",
      "chunkFile": "chunk-02.json",
      "owns": [
        {
          "id": "ridge-loc-tower",
          "collection": "locations",
          "page": 45
        },
        {
          "id": "ridge-clue-oil",
          "collection": "clues",
          "page": 50
        }
      ],
      "expectedCounts": {
        "locations": 1,
        "clues": 1
      }
    }
  ],
  "sharedIds": [],
  "completed": [
    {
      "section": "s01",
      "file": "chunk-01.json",
      "counts": {
        "locations": 1,
        "actors": 1,
        "scenes": 1
      }
    }
  ],
  "pending": [
    {
      "id": "ridge-loc-tower",
      "referencedBy": "town-actor-reeve",
      "expectedIn": "s02"
    }
  ],
  "gaps": []
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
    fix: "Use smaller sections in Stage 1 (about 10 pages), and start a fresh chat for each pass and paste the full conversion prompt, the manifest and the section key, so earlier text does not crowd out the section.",
  },
  {
    problem: "The output is too large",
    signs:
      "The JSON stops mid-way, has no closing brace, or the assistant replies that it shortened the result.",
    fix: "Convert smaller sections, one file per section. Never ask it to continue a cut-off JSON reply: redo that section in two.",
  },
];
