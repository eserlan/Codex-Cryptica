import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type AdventureJsonV1,
  validateAdventureJson,
} from "@codex/adventure-engine";
import {
  STAGED_ASSEMBLE_FUNCTION,
  STAGED_ASSEMBLE_SCRIPT,
  STAGED_CHECK_FUNCTION,
  STAGED_CHECK_SCRIPT,
  STAGED_CHUNK_PROMPT,
  STAGED_COVERAGE_INTRO,
  STAGED_COVERAGE_PROMPT,
  STAGED_FAILURE_MODES,
  STAGED_INVENTORY_PROMPT,
  STAGED_MANIFEST_EXAMPLE,
  STAGED_NEW_CHAT_PROMPT,
  STAGED_SAME_CHAT_PROMPT,
} from "./staged-conversion.js";

type Assemble = (
  chunks: unknown[],
  labels?: string[],
) => {
  adventure: AdventureJsonV1;
  errors: string[];
  notices: string[];
};

const assemble = new Function(
  `${STAGED_ASSEMBLE_FUNCTION}; return assemble;`,
)() as Assemble;

const meta = {
  formatVersion: "adventure-json/v1",
  id: "long-sample",
  title: "Long Sample",
  version: "1.0.0",
  premise: {
    background: "A border town and a cave.",
    hook: "Find the beacon.",
  },
  source: { title: "Long Sample" },
};

const empty = {
  locations: [],
  actors: [],
  factions: [],
  scenes: [],
  encounters: [],
  clues: [],
  rumours: [],
  items: [],
  secrets: [],
  endings: [],
  unresolved: [],
};

// Chunk 1 (pages 1-10): the town. Its actor lives in a location defined in chunk 2.
const chunkOne = {
  ...meta,
  ...empty,
  actors: [
    {
      id: "actor-reeve",
      name: "Reeve Tomas",
      summary: "The worried village official.",
      locationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      sourceRef: { page: 3, section: "The Town" },
    },
  ],
  scenes: [
    {
      id: "scene-town",
      title: "The Town",
      summary: "The party meets the Reeve.",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      sourceRef: { page: 2, section: "The Town" },
    },
  ],
};

// Chunk 2 (pages 11-20): the tower. Its clue is placed with a chunk 1 actor.
const chunkTwo = {
  ...meta,
  ...empty,
  locations: [
    {
      id: "loc-tower",
      name: "Ridge Watchtower",
      summary: "A stone signal tower.",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      sourceRef: { page: 12, section: "The Tower" },
    },
  ],
  clues: [
    {
      id: "clue-oil",
      text: "The lamp oil is gone.",
      placedActorId: "actor-reeve",
      placedLocationId: "loc-tower",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      sourceRef: { page: 14, section: "The Tower" },
    },
  ],
};

const errorCodes = (data: unknown) => {
  const result = validateAdventureJson(data);
  return result.ok ? [] : result.errors.map((e) => e.code);
};

describe("staged conversion: assembling chunks (#4896)", () => {
  it("each chunk alone has dangling cross-chunk references", () => {
    expect(errorCodes(chunkOne)).toContain("UNRESOLVED_REFERENCE");
    expect(errorCodes(chunkTwo)).toContain("UNRESOLVED_REFERENCE");
  });

  it("assembly keeps cross-chunk references and yields one valid v1 document", () => {
    const { adventure, errors } = assemble([chunkOne, chunkTwo]);

    expect(errors).toEqual([]);
    expect(validateAdventureJson(adventure).ok).toBe(true);
    expect(adventure.actors[0]?.locationId).toBe("loc-tower");
    expect(adventure.clues[0]?.placedActorId).toBe("actor-reeve");
  });

  it("preserves stable ids, order and sourceRef from every chunk", () => {
    const { adventure } = assemble([chunkOne, chunkTwo]);

    expect(adventure.actors.map((a) => a.id)).toEqual(["actor-reeve"]);
    expect(adventure.locations.map((l) => l.id)).toEqual(["loc-tower"]);
    expect(adventure.actors[0]?.sourceRef).toEqual({
      page: 3,
      section: "The Town",
    });
    expect(adventure.clues[0]?.sourceRef?.page).toBe(14);
  });

  it("merges an identical entry that appears in two chunks only once", () => {
    const { adventure, errors, notices } = assemble([
      chunkOne,
      { ...chunkTwo, actors: chunkOne.actors },
    ]);

    expect(errors).toEqual([]);
    expect(adventure.actors).toHaveLength(1);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("actors");
    expect(notices[0]).toContain('"actor-reeve"');
    expect(notices[0]).toContain("chunk 1");
    expect(notices[0]).toContain("chunk 2");
  });

  it("fails when an identical record reuses an id in another collection", () => {
    const { scenes } = chunkOne;
    const { errors } = assemble([
      chunkOne,
      { ...chunkTwo, locations: [...chunkTwo.locations, scenes[0]] },
    ]);

    expect(errors).toEqual([
      'chunk 2: locations id "scene-town" is already used by scenes in chunk 1; each id must be unique across all collections',
    ]);
  });

  it("fails when different records share an id across collections", () => {
    const { errors } = assemble([
      chunkOne,
      {
        ...chunkTwo,
        locations: [{ ...chunkTwo.locations[0], id: "actor-reeve" }],
      },
    ]);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("locations");
    expect(errors[0]).toContain("actors");
    expect(errors[0]).toContain('"actor-reeve"');
  });

  it("names chunk files in messages when labels are given", () => {
    const { errors } = assemble(
      [
        chunkOne,
        {
          ...chunkTwo,
          locations: [{ ...chunkTwo.locations[0], id: "actor-reeve" }],
        },
      ],
      ["chunk-01.json", "chunk-02.json"],
    );

    expect(errors[0]).toBe(
      'chunk 2 (chunk-02.json): locations id "actor-reeve" is already used by actors in chunk 1 (chunk-01.json); each id must be unique across all collections',
    );
  });

  it("reports errors in a deterministic order", () => {
    const chunks = [
      chunkOne,
      {
        ...chunkTwo,
        premise: { ...meta.premise, hook: "Other." },
        locations: [
          { ...chunkTwo.locations[0], id: "scene-town" },
          { ...chunkTwo.locations[0], id: "actor-reeve" },
        ],
        clues: [{ ...chunkOne.scenes[0], id: "scene-town" }],
      },
      {
        ...meta,
        ...empty,
        factions: [{ ...chunkOne.scenes[0], id: "actor-reeve" }],
      },
    ];
    const expected = [
      "chunk 2: premise differs from chunk 1",
      'chunk 2: locations id "scene-town" is already used by scenes in chunk 1; each id must be unique across all collections',
      'chunk 2: locations id "actor-reeve" is already used by actors in chunk 1; each id must be unique across all collections',
      'chunk 2: clues id "scene-town" is already used by scenes in chunk 1; each id must be unique across all collections',
      'chunk 3: factions id "actor-reeve" is already used by actors in chunk 1; each id must be unique across all collections',
    ];

    expect(assemble(chunks).errors).toEqual(expected);
    expect(assemble(chunks).errors).toEqual(expected);
  });

  it("reports, and does not resolve, a conflicting duplicate id", () => {
    const conflicting = {
      ...chunkTwo,
      actors: [{ ...chunkOne.actors[0], name: "Reeve Thomas" }],
    };
    const { errors } = assemble([chunkOne, conflicting]);

    expect(errors).toEqual([
      'chunk 2: actors id "actor-reeve" is defined differently from chunk 1; the same id must not have two different definitions',
    ]);
  });

  it("rejects mismatched premise, source, description and system instead of silently using chunk 1", () => {
    const changed = {
      ...chunkTwo,
      premise: { ...meta.premise, hook: "Different hook." },
      source: { title: "An unrelated publication" },
      description: "A new description",
      system: "other-system",
    };
    const { errors } = assemble([chunkOne, changed]);

    expect(errors).toEqual([
      "chunk 2: description differs from chunk 1",
      "chunk 2: premise differs from chunk 1",
      "chunk 2: source differs from chunk 1",
      "chunk 2: system differs from chunk 1",
    ]);
  });

  it("accepts nested metadata with the same values in different object-key order", () => {
    const reordered = {
      ...chunkTwo,
      premise: { hook: meta.premise.hook, background: meta.premise.background },
    };
    const { errors } = assemble([chunkOne, reordered]);

    expect(errors).toEqual([]);
  });

  it("preserves matching top-level extensions across chunks and rejects mismatched extensions", () => {
    const ext = {
      "codex-cryptica.adventure-correspondence": [
        {
          previousId: "scene-old",
          currentId: "scene-town",
          collection: "scenes",
        },
      ],
    };
    const { adventure, errors } = assemble([
      { ...chunkOne, extensions: ext },
      { ...chunkTwo, extensions: ext },
    ]);

    expect(errors).toEqual([]);
    expect(adventure.extensions).toEqual(ext);

    const mismatch = assemble([
      { ...chunkOne, extensions: ext },
      { ...chunkTwo, extensions: {} },
    ]);
    expect(mismatch.errors).toEqual([
      "chunk 2: extensions differs from chunk 1",
    ]);
  });

  it("deduplicates semantically identical entries regardless of nested object-key ordering", () => {
    const sameActor = {
      ...chunkOne.actors[0],
      sourceRef: { section: "The Town", page: 3 },
    };
    const reorderedActor = Object.fromEntries(
      Object.entries(sameActor).reverse(),
    );
    const { adventure, errors } = assemble([
      chunkOne,
      { ...chunkTwo, actors: [reorderedActor] },
    ]);

    expect(errors).toEqual([]);
    expect(adventure.actors).toHaveLength(1);
    expect(adventure.actors[0]).toEqual(chunkOne.actors[0]);
  });

  it("reports chunks that do not belong to the same adventure", () => {
    const { errors } = assemble([
      chunkOne,
      { ...chunkTwo, id: "other-adventure" },
    ]);

    expect(errors).toContain("chunk 2: id differs from chunk 1");
  });

  it("leaves a genuinely missing section visible instead of inventing it", () => {
    const { adventure } = assemble([chunkOne]);

    expect(errorCodes(adventure)).toContain("UNRESOLVED_REFERENCE");
  });

  it("ships the same function the tests run in the copyable script", () => {
    expect(STAGED_ASSEMBLE_SCRIPT).toContain(STAGED_ASSEMBLE_FUNCTION);
    expect(STAGED_ASSEMBLE_SCRIPT).toContain("process.exit(1)");
    expect(STAGED_ASSEMBLE_SCRIPT).toContain(
      "fs.renameSync(temporary, output)",
    );
    expect(STAGED_ASSEMBLE_SCRIPT).toContain('flag: "wx"');
    expect(STAGED_ASSEMBLE_SCRIPT).not.toContain("> adventure.json");
  });
});

describe("staged conversion: prompts and failure modes (#4896)", () => {
  it("inventory prompt converts nothing, asks for the manifest and reports unreadable pages honestly", () => {
    expect(STAGED_INVENTORY_PROMPT).toContain("inventory only");
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "do not write any Adventure JSON",
    );
    expect(STAGED_INVENTORY_PROMPT).toContain("cannot read");
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "instead of guessing from the title",
    );
    expect(STAGED_INVENTORY_PROMPT).toContain("adventure-checkpoint/v1.json");
    expect(STAGED_INVENTORY_PROMPT).toContain('"status" to "partial"');
    expect(STAGED_INVENTORY_PROMPT).toContain('"metadata"');
    expect(STAGED_INVENTORY_PROMPT).toContain('"page"');
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "Every owned id must carry its page or anchor",
    );
  });

  it("section prompt is a self-contained handoff with a separate completion delta", () => {
    expect(STAGED_CHUNK_PROMPT).not.toMatch(/earlier/i);
    expect(STAGED_CHUNK_PROMPT).toContain(
      "complete Adventure JSON v1 conversion prompt",
    );
    expect(STAGED_CHUNK_PROMPT).toContain("checkpoint manifest JSON");
    expect(STAGED_CHUNK_PROMPT).toContain("one section key");
    expect(STAGED_CHUNK_PROMPT).toContain("unchanged");
    expect(STAGED_CHUNK_PROMPT).toContain("Never reconstruct or rephrase it");
    expect(STAGED_CHUNK_PROMPT).toContain(
      'Define only the ids listed in this section\'s "owns"',
    );
    expect(STAGED_CHUNK_PROMPT).toContain("Use the manifest's ids");
    expect(STAGED_CHUNK_PROMPT).toContain("never invent anything to connect");
    expect(STAGED_CHUNK_PROMPT).toContain('"unresolved"');
    expect(STAGED_CHUNK_PROMPT).toContain("do not start a new inventory");
    expect(STAGED_CHUNK_PROMPT).toContain(
      "entire reply the JSON document only",
    );
    expect(STAGED_CHUNK_PROMPT).toContain("as a separate message");
    expect(STAGED_CHUNK_PROMPT).toContain("completion delta");
    expect(STAGED_CHUNK_PROMPT).toContain('"status": "complete" or "failed"');
    expect(STAGED_CHUNK_PROMPT).toContain("never a regenerated manifest");
  });

  it("same-chat and new-chat prompts preserve the structured pending-reference delta", () => {
    for (const prompt of [STAGED_SAME_CHAT_PROMPT, STAGED_NEW_CHAT_PROMPT]) {
      expect(prompt).toContain('"pending": [{ "id": "<referenced id>"');
      expect(prompt).toContain(
        '"referencedBy": "<id containing the reference>"',
      );
      expect(prompt).toContain('"expectedIn": "<owning section key>"');
      expect(prompt).toContain(
        "list every id referenced by this chunk but defined in a different section",
      );
      expect(prompt).toContain(
        'Each pending item must include "id", "referencedBy" and "expectedIn"',
      );
    }
  });

  it("uses file page positions and one defining section per entry (from the PDF smoke test)", () => {
    expect(STAGED_INVENTORY_PROMPT).toContain("position in the file");
    expect(STAGED_INVENTORY_PROMPT).toContain("Sections must not overlap");
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "Each entry has one defining section",
    );
    expect(STAGED_INVENTORY_PROMPT).toContain("do not invent page numbers");
    expect(STAGED_CHUNK_PROMPT).toContain("not any number printed on the page");
    expect(STAGED_CHUNK_PROMPT).toContain("never invent a page number");
  });

  it("coverage prompt relies on the chunk JSON, points at the check script and refuses to assume a section is done", () => {
    expect(STAGED_COVERAGE_PROMPT).toContain("Do not assume a section is done");
    expect(STAGED_COVERAGE_PROMPT).toContain(
      'mark that section "not converted"',
    );
    expect(STAGED_COVERAGE_PROMPT).toContain("the JSON file for every chunk");
    expect(STAGED_COVERAGE_PROMPT).toContain(
      "Do not rely on completion deltas",
    );
    expect(STAGED_COVERAGE_PROMPT).toContain("node check.js");
    expect(STAGED_COVERAGE_PROMPT).toContain("no chunk defines");
  });

  it("keeps every prompt provider-neutral", () => {
    for (const text of [
      STAGED_INVENTORY_PROMPT,
      STAGED_CHUNK_PROMPT,
      STAGED_COVERAGE_PROMPT,
    ]) {
      expect(text).not.toMatch(
        /\b(ChatGPT|Claude|Gemini|GPT|OpenAI|Anthropic)\b/,
      );
    }
  });

  it("separates unreadable input, too-large input and too-large output", () => {
    expect(STAGED_FAILURE_MODES.map((m) => m.problem)).toEqual([
      "The assistant cannot read the document",
      "The input is too large",
      "The output is too large",
    ]);
    for (const mode of STAGED_FAILURE_MODES) {
      expect(mode.signs.length).toBeGreaterThan(20);
      expect(mode.fix.length).toBeGreaterThan(20);
    }
  });

  it("tells a too-large input to start a fresh chat with the prompt, manifest and section key", () => {
    const fix = STAGED_FAILURE_MODES[1]!.fix;
    expect(fix).toContain("fresh chat");
    expect(fix).toContain("manifest");
    expect(fix).toContain("section key");
  });
});

type Problem = { kind: string; message: string };
type Check = (
  manifest: unknown,
  chunks: { file: string; json: unknown }[],
) => { ok: boolean; problems: Problem[] };

const check = new Function(
  `${STAGED_CHECK_FUNCTION}; return checkStagedChunks;`,
)() as Check;

const FIXTURE_DIR = resolve(
  import.meta.dirname,
  "../../../../../../fixtures/adventures/staged-manifest",
);
const readFixture = (name: string) =>
  JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), "utf8"));
const chunkFiles = ["chunk-01.json", "chunk-02.json", "chunk-03.json"];
const fresh = () => ({
  manifest: readFixture("manifest.json"),
  chunks: chunkFiles.map((file) => ({ file, json: readFixture(file) })),
});
const kinds = (manifest: unknown, chunks: { file: string; json: unknown }[]) =>
  check(manifest, chunks).problems.map((p) => p.kind);

describe("staged conversion: checkpoint manifest check (#5003)", () => {
  it("passes the full fixture and assembles into valid Adventure JSON v1", () => {
    const { manifest, chunks } = fresh();

    expect(check(manifest, chunks)).toEqual({ ok: true, problems: [] });
    const { adventure, errors } = assemble(chunks.map((c) => c.json));
    expect(errors).toEqual([]);
    expect(validateAdventureJson(adventure).ok).toBe(true);
  });

  it("keeps metadata identical to the manifest and ids equal to each section's owns", () => {
    const { manifest, chunks } = fresh();

    for (const index of [0, 2]) {
      const json = chunks[index]!.json as Record<string, unknown>;
      for (const key of Object.keys(manifest.metadata)) {
        expect(json[key]).toEqual(manifest.metadata[key]);
      }
    }
    manifest.sections.forEach(
      (section: { owns: { id: string }[] }, index: number) => {
        const json = chunks[index]!.json as Record<string, { id: string }[]>;
        const ids = Object.values(json)
          .filter(Array.isArray)
          .flatMap((entries) => entries.map((entry) => entry.id));
        expect(ids.sort()).toEqual(section.owns.map((o) => o.id).sort());
      },
    );
  });

  it("matches the published example and keeps the script and function identical", () => {
    const example = readFileSync(
      resolve(
        FIXTURE_DIR,
        "../../../apps/web/static/schemas/adventure-checkpoint/examples/staged-manifest.v1.json",
      ),
      "utf8",
    );

    expect(STAGED_MANIFEST_EXAMPLE).toBe(example.trimEnd());
    expect(STAGED_CHECK_SCRIPT).toContain(STAGED_CHECK_FUNCTION);
    expect(STAGED_CHECK_SCRIPT).toContain("process.exit(1)");
    expect(STAGED_CHECK_SCRIPT).not.toContain("writeFileSync");
  });

  it("reports invalid-manifest and stops", () => {
    const { manifest, chunks } = fresh();

    expect(check({ ...manifest, manifestVersion: 2 }, chunks)).toEqual({
      ok: false,
      problems: [{ kind: "invalid-manifest", message: expect.any(String) }],
    });
    expect(kinds({ ...manifest, kind: undefined }, chunks)).toEqual([
      "invalid-manifest",
    ]);
  });

  it("reports metadata-missing from the manifest and from a chunk", () => {
    const { manifest, chunks } = fresh();
    const noPremise = { ...manifest, metadata: { ...manifest.metadata } };
    delete noPremise.metadata.premise;
    expect(kinds(noPremise, chunks)).toContain("metadata-missing");

    const stripped = structuredClone(chunks);
    delete (stripped[1]!.json as Record<string, unknown>).title;
    expect(kinds(manifest, stripped)).toEqual(["metadata-missing"]);
  });

  it("reports metadata-mismatch for a changed value, but not for key order", () => {
    const { manifest, chunks } = fresh();
    const changed = structuredClone(chunks);
    (changed[0]!.json as Record<string, unknown>).premise = {
      hook: "Different.",
      background: "Different.",
    };
    expect(kinds(manifest, changed)).toEqual(["metadata-mismatch"]);

    const reordered = structuredClone(chunks);
    const premise = manifest.metadata.premise;
    (reordered[0]!.json as Record<string, unknown>).premise = {
      hook: premise.hook,
      background: premise.background,
    };
    expect(check(manifest, reordered).ok).toBe(true);

    const extra = structuredClone(chunks);
    (extra[0]!.json as Record<string, unknown>).system = "other";
    expect(kinds(manifest, extra)).toEqual(["metadata-mismatch"]);
  });

  it("reports duplicate-owner for a repeated id and a disagreeing shared owner", () => {
    const { manifest, chunks } = fresh();
    const duplicated = structuredClone(manifest);
    duplicated.sections[0].owns.push(duplicated.sections[1].owns[0]);
    expect(kinds(duplicated, chunks)).toContain("duplicate-owner");

    const shared = structuredClone(manifest);
    shared.sharedIds[0].owner = "s01";
    expect(kinds(shared, chunks)).toEqual(["duplicate-owner"]);
  });

  it("reports unowned-definition, missing-id and count-mismatch", () => {
    const { manifest, chunks } = fresh();
    const stray = structuredClone(chunks);
    const json = stray[0]!.json as Record<string, unknown[]>;
    json.locations!.push({
      ...(json.locations![0] as object),
      id: "town-extra",
    });
    expect(kinds(manifest, stray)).toEqual([
      "unowned-definition",
      "count-mismatch",
    ]);

    const dropped = structuredClone(chunks);
    (dropped[0]!.json as Record<string, unknown[]>).scenes = [];
    expect(kinds(manifest, dropped)).toEqual(["count-mismatch", "missing-id"]);
  });

  it("ignores unresolved records for ownership and counts, and they never satisfy a pending id", () => {
    const { manifest, chunks } = fresh();
    const gap = structuredClone(chunks);
    (gap[0]!.json as Record<string, unknown[]>).unresolved = [
      {
        id: "town-gap",
        code: "UNREADABLE",
        message: "A page was unreadable.",
        epistemicStatus: "unresolved",
      },
    ];
    expect(check(manifest, gap)).toEqual({ ok: true, problems: [] });

    const pending = structuredClone(manifest);
    pending.pending.push({
      id: "town-gap",
      referencedBy: "ridge-clue-oil",
      expectedIn: "s01",
    });
    expect(kinds(pending, gap)).toEqual(["pending-reference"]);
  });

  it("tells the section pass the source is attached", () => {
    expect(STAGED_CHUNK_PROMPT).toContain(
      "The source adventure is attached; convert only from it, and say so if it is missing.",
    );
  });

  it("provides distinct same-chat and self-contained new-chat handoffs", () => {
    expect(STAGED_SAME_CHAT_PROMPT).toContain("check that this chat contains");
    expect(STAGED_SAME_CHAT_PROMPT).toContain(
      "checkpoint manifest from Stage 1",
    );
    expect(STAGED_SAME_CHAT_PROMPT).toContain(
      "If any is missing, do not convert",
    );

    expect(STAGED_NEW_CHAT_PROMPT).toContain(
      "This chat has no earlier context",
    );
    expect(STAGED_NEW_CHAT_PROMPT).toContain(
      "checkpoint manifest JSON from Stage 1",
    );
    expect(STAGED_NEW_CHAT_PROMPT).toContain(
      "source pages or text for this one section",
    );
    expect(STAGED_NEW_CHAT_PROMPT).toContain(
      "If anything is missing, do not convert",
    );
    expect(STAGED_NEW_CHAT_PROMPT).toContain(
      "[PASTE ONE SECTION KEY, SUCH AS s02]",
    );
  });

  it("reports missing-chunk and pending-reference when a chunk is dropped", () => {
    const { manifest, chunks } = fresh();
    const result = check(manifest, chunks.slice(0, 2));

    expect(result.problems.map((p) => p.kind)).toEqual([
      "missing-chunk",
      "pending-reference",
    ]);
    expect(result.problems[0]!.message).toContain("s03");
    expect(result.problems[1]!.message).toContain("deep-actor-warden");
  });

  it("reports unknown-chunk and manifest-in-chunk", () => {
    const { manifest, chunks } = fresh();
    const extra = [...chunks, { file: "chunk-09.json", json: {} }];
    expect(kinds(manifest, extra)).toEqual(["unknown-chunk"]);

    const pasted = structuredClone(chunks);
    (pasted[2]!.json as Record<string, unknown>).kind = manifest.kind;
    expect(kinds(manifest, pasted)).toEqual(["manifest-in-chunk"]);
  });

  it("reports uncovered pages as merged ranges, and skips unpaginated sources", () => {
    const { manifest, chunks } = fresh();
    const gap = structuredClone(manifest);
    gap.sections[1].pages = { from: 51, to: 80 };
    gap.source.unreadable = [{ from: 116, to: 120 }];
    const problems = check(gap, chunks).problems.filter(
      (p) => p.kind === "uncovered-range",
    );
    expect(problems.map((p) => p.message)).toEqual([
      expect.stringContaining("pages 41-50"),
      expect.stringContaining("pages 111-115"),
    ]);

    gap.source.pageCount = null;
    expect(kinds(gap, chunks)).not.toContain("uncovered-range");
  });

  it("rejects section and unreadable ranges outside the source and reversed ranges", () => {
    const { manifest, chunks } = fresh();
    const impossible = structuredClone(manifest);
    impossible.sections[0].pages = { from: 1, to: 100 };
    impossible.source.unreadable = [{ from: 90, to: 80 }];

    expect(kinds(impossible, chunks)).toContain("invalid-page-range");
  });

  it("requires each owned entry page to fall inside its defining section", () => {
    const { manifest, chunks } = fresh();
    const wrongPage = structuredClone(manifest);
    wrongPage.sections[0].owns[0].page = 41;

    expect(kinds(wrongPage, chunks)).toContain("owned-page-out-of-section");
  });

  it("rejects page ownership in an anchor section of a paginated source", () => {
    const { manifest, chunks } = fresh();
    const misplaced = structuredClone(manifest);
    misplaced.source.pageCount = 80;
    misplaced.source.unreadable = [];
    misplaced.sections[2].anchor = "The Deep";
    delete misplaced.sections[2].pages;
    misplaced.sections[2].owns[0].page = 81;

    expect(kinds(misplaced, chunks)).toEqual(
      expect.arrayContaining([
        "missing-section-pages",
        "owned-page-out-of-section",
      ]),
    );
    expect(kinds(misplaced, chunks)).not.toContain("uncovered-range");
  });

  it("checks very large sources using ranges rather than per-page work", () => {
    const { manifest, chunks } = fresh();
    const large = structuredClone(manifest);
    large.source.pageCount = 100_000_000;
    large.sections[0].pages = { from: 1, to: 100_000_000 };

    expect(check(large, chunks)).toEqual({ ok: true, problems: [] });
  });

  it("JSON-quotes model-generated IDs in diagnostics so terminal controls stay escaped", () => {
    const { manifest, chunks } = fresh();
    const controlId = "stray-\u001b[2J-id";
    const altered = structuredClone(chunks);
    (altered[0]!.json as Record<string, { id: string }[]>).locations.push({
      id: controlId,
    });

    const problem = check(manifest, altered).problems.find(
      (entry) => entry.kind === "unowned-definition",
    );
    expect(problem?.message).toContain(JSON.stringify(controlId));
    expect(problem?.message).not.toContain("\u001b");
  });
});

describe("staged conversion: assemble script and fixture (#5004)", () => {
  it("keeps every entry and sourceRef of the reference fixture", () => {
    const chunks = chunkFiles.map((file) => readFixture(file));
    const { adventure, errors } = assemble(chunks);

    expect(errors).toEqual([]);
    expect(validateAdventureJson(adventure).ok).toBe(true);
    for (const name of Object.keys(empty)) {
      expect((adventure as unknown as Record<string, unknown>)[name]).toEqual(
        chunks.flatMap((c) => c[name] ?? []),
      );
    }
  });

  const runScript = (files: Record<string, unknown>) => {
    const dir = mkdtempSync(join(tmpdir(), "assemble-"));
    writeFileSync(join(dir, "assemble.js"), STAGED_ASSEMBLE_SCRIPT);
    writeFileSync(join(dir, "adventure.json"), "KNOWN");
    for (const [name, json] of Object.entries(files)) {
      writeFileSync(join(dir, name), JSON.stringify(json));
    }
    const result = spawnSync(
      process.execPath,
      ["assemble.js", ...Object.keys(files)],
      { cwd: dir, encoding: "utf8" },
    );
    return { dir, result };
  };

  it("leaves an existing adventure.json untouched when chunks collide", () => {
    const { dir, result } = runScript({
      "chunk-01.json": chunkOne,
      "chunk-02.json": {
        ...chunkTwo,
        locations: [{ ...chunkOne.scenes[0] }],
      },
    });
    try {
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("chunk-02.json");
      expect(result.stderr).toContain("locations");
      expect(result.stderr).toContain('"scene-town"');
      expect(readFileSync(join(dir, "adventure.json"), "utf8")).toBe("KNOWN");
      expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prints that completeness was not verified on success", () => {
    const { dir, result } = runScript({
      "chunk-01.json": chunkOne,
      "chunk-02.json": chunkTwo,
    });
    try {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("not verified");
      expect(result.stdout).toContain("check.js");
      const written = JSON.parse(
        readFileSync(join(dir, "adventure.json"), "utf8"),
      );
      expect(validateAdventureJson(written).ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Stage 3 coverage inputs", () => {
  const requiredPhrases: (string | string[])[] = [
    "manifest",
    "every completion delta merged in",
    ["chunk JSON", "JSON file for every chunk"],
    "completion delta",
  ];

  for (const [name, text] of [
    ["intro", STAGED_COVERAGE_INTRO],
    ["prompt", STAGED_COVERAGE_PROMPT],
  ] as const) {
    it(`the ${name} names the same inputs`, () => {
      for (const phrase of requiredPhrases) {
        const options = Array.isArray(phrase) ? phrase : [phrase];
        expect(options.some((option) => text.includes(option))).toBe(true);
      }
    });

    it(`the ${name} says a completion delta is not proof`, () => {
      expect(/not proof|does not prove/.test(text)).toBe(true);
    });
  }
});
