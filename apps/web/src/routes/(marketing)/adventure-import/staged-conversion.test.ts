import { describe, expect, it } from "vitest";
import {
  type AdventureJsonV1,
  validateAdventureJson,
} from "@codex/adventure-engine";
import {
  STAGED_ASSEMBLE_FUNCTION,
  STAGED_ASSEMBLE_SCRIPT,
  STAGED_CHUNK_PROMPT,
  STAGED_COVERAGE_PROMPT,
  STAGED_FAILURE_MODES,
  STAGED_INVENTORY_PROMPT,
  STAGED_NEW_CHAT_PROMPT,
  PROMPT_END_MARKER,
  PROMPT_TXT_URL,
} from "./staged-conversion.js";

type Assemble = (chunks: unknown[]) => {
  adventure: AdventureJsonV1;
  errors: string[];
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
    const { adventure, errors } = assemble([
      chunkOne,
      { ...chunkTwo, actors: chunkOne.actors },
    ]);

    expect(errors).toEqual([]);
    expect(adventure.actors).toHaveLength(1);
  });

  it("reports, and does not resolve, a conflicting duplicate id", () => {
    const conflicting = {
      ...chunkTwo,
      actors: [{ ...chunkOne.actors[0], name: "Reeve Thomas" }],
    };
    const { errors } = assemble([chunkOne, conflicting]);

    expect(errors).toEqual([
      'chunk 2: id "actor-reeve" is defined differently elsewhere',
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
  it("inventory prompt converts nothing and reports unreadable pages honestly", () => {
    expect(STAGED_INVENTORY_PROMPT).toContain("inventory only");
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "do not write any Adventure JSON",
    );
    expect(STAGED_INVENTORY_PROMPT).toContain("cannot read");
    expect(STAGED_INVENTORY_PROMPT).toContain(
      "instead of guessing from the title",
    );
  });

  it("section prompt keeps ids stable, forbids bridges and requires a completion record", () => {
    expect(STAGED_CHUNK_PROMPT).toContain("exactly the ids from the inventory");
    expect(STAGED_CHUNK_PROMPT).toContain(
      'top-level "extensions" when present',
    );
    expect(STAGED_CHUNK_PROMPT).toContain(
      "full mapping unchanged in every chunk",
    );
    expect(STAGED_CHUNK_PROMPT).toContain(
      "Never invent an entry that belongs to another section",
    );
    expect(STAGED_CHUNK_PROMPT).toContain("Never invent anything to connect");
    expect(STAGED_CHUNK_PROMPT).toContain('"sourceRef" with the page number');
    expect(STAGED_CHUNK_PROMPT).toContain("completion record");
    expect(STAGED_CHUNK_PROMPT).toContain(
      "entire reply the JSON document only",
    );
    expect(STAGED_CHUNK_PROMPT).toContain("as a separate message");
    expect(STAGED_CHUNK_PROMPT).toContain(
      "say so in the completion record instead of presenting it as complete",
    );
  });

  it("uses file page positions and one defining section per entry (from the PDF smoke test)", () => {
    expect(STAGED_INVENTORY_PROMPT).toContain("position in the file");
    expect(STAGED_INVENTORY_PROMPT).toContain("Sections must not overlap");
    expect(STAGED_INVENTORY_PROMPT).toContain("so defines it");
    expect(STAGED_CHUNK_PROMPT).toContain("not any number printed on the page");
    expect(STAGED_CHUNK_PROMPT).toContain(
      "define an entry only if the inventory says this section defines it",
    );
  });

  it("coverage prompt refuses to assume a section is done", () => {
    expect(STAGED_COVERAGE_PROMPT).toContain("Do not assume a section is done");
    expect(STAGED_COVERAGE_PROMPT).toContain(
      'mark that section "not converted"',
    );
    expect(STAGED_COVERAGE_PROMPT).toContain(
      "referred to but no section defined",
    );
  });

  it("keeps every prompt provider-neutral", () => {
    for (const text of [
      STAGED_INVENTORY_PROMPT,
      STAGED_CHUNK_PROMPT,
      STAGED_NEW_CHAT_PROMPT,
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

  it("gives the new-chat prompt four artefacts in order, with no chat memory", () => {
    const text = STAGED_NEW_CHAT_PROMPT;
    expect(text).toContain(PROMPT_TXT_URL);
    expect(text).toContain(PROMPT_END_MARKER);
    const positions = [
      "full Adventure JSON v1 conversion prompt",
      "Stage 1 inventory, including the locked package metadata",
      "source pages or text for this one section",
      "Stage 2 instructions",
    ].map((part) => text.indexOf(part));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).not.toContain("gave you earlier");
    expect(text).not.toMatch(/earlier/i);
    expect(text).toContain("word for word");
    expect(text).toContain('"chunk-02.json"');
    expect(text).toContain("never invent a page number");
  });

  it("stops on missing prerequisites in both section prompts", () => {
    for (const text of [STAGED_CHUNK_PROMPT, STAGED_NEW_CHAT_PROMPT]) {
      expect(text).toContain("do not convert");
      expect(text).toContain("short plain list naming each missing item");
      expect(text).toContain('A "continue" request does not count');
      expect(text).toContain("must not invent entries or ids");
      expect(text).toContain("locked package metadata");
    }
  });

  it("asks Stage 1 for a locked metadata block", () => {
    expect(STAGED_INVENTORY_PROMPT).toContain('"Locked package metadata"');
    for (const field of [
      "formatVersion",
      "id",
      "title",
      "version",
      "premise",
      "source",
      "description",
      "system",
      "extensions",
    ]) {
      expect(STAGED_INVENTORY_PROMPT).toContain(`"${field}"`);
    }
    expect(STAGED_INVENTORY_PROMPT).toContain("word for word");
    expect(STAGED_CHUNK_PROMPT).toContain('"Locked package metadata"');
  });

  it("points the too-large fix at the new-chat handoff", () => {
    const fix = STAGED_FAILURE_MODES.find(
      (m) => m.problem === "The input is too large",
    )!.fix;
    expect(fix).toContain("new-chat handoff");
    expect(fix).toContain("canonical prompt");
    expect(fix).toContain("inventory");
    expect(fix).toContain("source");
  });
});
