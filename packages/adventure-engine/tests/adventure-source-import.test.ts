import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureSourcePackageSchema,
  MAX_ADVENTURE_RETRIEVAL_CHARS,
  getAdventurePackagePath,
  importAndSaveAdventureMarkdown,
  listAdventurePackageHashes,
  loadAdventurePackage,
  parseAdventureMarkdown,
  retrieveAdventureContext,
  saveAdventurePackage,
  type AdventurePackageFileIO,
  type AdventureSourcePackage,
} from "../src";
import { ReferenceOneShotKeySchema } from "./reference-one-shot-key";

const fixturesDir = resolve(
  __dirname,
  "../../../fixtures/adventures/reference-one-shot",
);
const readFixture = (relPath: string) =>
  readFileSync(resolve(fixturesDir, relPath), "utf8");

const adventureMd = readFixture("adventure.md");
const answerKey = ReferenceOneShotKeySchema.parse(
  JSON.parse(readFixture("answer-key.json")),
);

function createMemoryIO(): AdventurePackageFileIO & {
  files: Map<string, string>;
  writeCalls: number;
} {
  const files = new Map<string, string>();
  const io: AdventurePackageFileIO & {
    files: Map<string, string>;
    writeCalls: number;
  } = {
    files,
    writeCalls: 0,
    async exists(path: string) {
      return files.has(path);
    },
    async read(path: string) {
      const value = files.get(path);
      if (value === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      return value;
    },
    async write(path: string, content: string) {
      io.writeCalls += 1;
      files.set(path, content);
    },
    async list(dir: string) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((k) => k.startsWith(prefix));
    },
    async remove(path: string) {
      files.delete(path);
    },
  };
  return io;
}

function assertCleanPackageMatchesKey(pkg: AdventureSourcePackage): void {
  expect(pkg.ambiguities).toEqual([]);
  expect(
    pkg.sections.map((s) => ({ sourceId: s.sourceId, title: s.title })),
  ).toEqual(answerKey.sections);
  expect(pkg.sections.every((s) => s.provenance === "source-grounded")).toBe(
    true,
  );
  expect(pkg.npcs.map((n) => n.name)).toEqual(
    answerKey.npcs.map((n) => n.name),
  );
  expect(pkg.npcs.every((n) => n.provenance === "source-grounded")).toBe(true);
  expect(pkg.secrets.length).toBe(answerKey.secrets.length);
  expect(
    pkg.secrets.every((s) => s.gmOnly && s.provenance === "source-grounded"),
  ).toBe(true);
  expect(pkg.scenes.every((s) => s.provenance === "source-grounded")).toBe(
    true,
  );
  expect(
    pkg.scenes.find((s) => s.sourceId === answerKey.branch.sourceId)
      ?.optionalBranch,
  ).toBe(true);
  expect(pkg.endings.map((e) => e.sourceId)).toEqual(
    answerKey.endings.map((e) => e.sourceId),
  );
  expect(pkg.endings.every((e) => e.provenance === "source-grounded")).toBe(
    true,
  );
}

describe("AdventureSourcePackage reference one-shot and variants", () => {
  it("AC1: matches the reference one-shot answer key with source-grounded provenance and zero ambiguities", async () => {
    const result = await parseAdventureMarkdown(adventureMd, {
      fileName: "adventure.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pkg = AdventureSourcePackageSchema.parse(result.package);
    expect(pkg.schemaVersion).toBe(1);
    expect(pkg.status).toBe("draft");
    expect(pkg.importMethod).toBe("markdown");
    expect(pkg.sourceIdentity).toEqual({
      fileName: "adventure.md",
      title: "The Last Grind",
    });
    assertCleanPackageMatchesKey(pkg);

    const wheelEncounter = pkg.encounters.find(
      (e) => e.sourceId === answerKey.alternativeSolution.sourceId,
    );
    expect(
      wheelEncounter?.alternativeSolutions.some(
        (a) => a.socialBypassOfCombat === true,
      ),
    ).toBe(true);
    expect(pkg.clues[0]?.primarySourceId).toBe(
      answerKey.missableClue.primarySourceId,
    );
    expect(pkg.clues[0]?.alternativeSourceId).toBe(
      answerKey.missableClue.alternativeSourceId,
    );
  });

  it("AC2: handles missing-headings.md by recording unresolved ambiguities and preserving body text", async () => {
    const md = readFixture("variants/missing-headings.md");
    const result = await parseAdventureMarkdown(md, {
      fileName: "missing-headings.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const missingHeadingAmbiguities = result.package.ambiguities.filter(
      (a) => a.code === "MISSING_HEADING" && a.provenance === "unresolved",
    );
    expect(missingHeadingAmbiguities.length).toBeGreaterThanOrEqual(2);

    const scene2 = result.package.sections.find(
      (s) => s.sourceId === "ros-scene-2-yard",
    );
    expect(scene2?.body).toContain("Wick guards the sluice lever.");
    const shrine = result.package.sections.find(
      (s) => s.sourceId === "ros-branch-shrine",
    );
    expect(shrine?.body).toContain("Aldous Holt");
  });

  it("AC3: handles duplicate-sections.md by preserving both sections and recording the duplicate heading ambiguity", async () => {
    const md = readFixture("variants/duplicate-sections.md");
    const result = await parseAdventureMarkdown(md, {
      fileName: "duplicate-sections.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const dupAmbiguity = result.package.ambiguities.find(
      (a) =>
        a.code === "DUPLICATE_HEADING" &&
        a.provenance === "unresolved" &&
        a.message.includes("Scene 2: The Mill Yard"),
    );
    expect(dupAmbiguity).toBeDefined();
    expect(
      result.package.sections.filter(
        (s) => s.title === "Scene 2: The Mill Yard",
      ).length,
    ).toBe(2);
  });

  it("AC4: handles contradictory.md by capturing Maren Holt's conflicting motivations as unresolved without guessing", async () => {
    const md = readFixture("variants/contradictory.md");
    const result = await parseAdventureMarkdown(md, {
      fileName: "contradictory.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const conflict = result.package.ambiguities.find(
      (a) =>
        a.code === "CONFLICTING_NPC_MOTIVATION" &&
        a.provenance === "unresolved" &&
        a.sourceId === "ros-npc-maren",
    );
    expect(conflict).toBeDefined();
    expect(conflict?.context).toContain("pay off her late mother's debt");
    expect(conflict?.context).toContain("debt dies with it");
    expect(
      result.package.npcs.find((n) => n.name === "Maren Holt")?.provenance,
    ).toBe("unresolved");
  });

  it("AC5: handles malformed.md by recording ambiguities for unclosed fence, no-space heading, skipped level, and broken table", async () => {
    const md = readFixture("variants/malformed.md");
    const result = await parseAdventureMarkdown(md, {
      fileName: "malformed.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const codes = new Set(result.package.ambiguities.map((a) => a.code));
    expect(codes.has("UNCLOSED_CODE_FENCE")).toBe(true);
    expect(codes.has("MALFORMED_HEADING_NO_SPACE")).toBe(true);
    expect(codes.has("SKIPPED_HEADING_LEVEL")).toBe(true);
    expect(codes.has("MALFORMED_TABLE")).toBe(true);
  });
});

describe("AdventureSourcePackage retrieval, persistence, and validation", () => {
  it("AC6: treats adversarial prompt injections as inert text and never leaks GM-only secrets when includeGmOnly is false", async () => {
    const md = readFixture("variants/adversarial.md");
    const result = await parseAdventureMarkdown(md, {
      fileName: "adversarial.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const scene1 = result.package.sections.find(
      (s) => s.sourceId === "ros-scene-1-landing",
    );
    const readAloudText = Array.isArray(scene1?.readAloud)
      ? scene1.readAloud.join(" ")
      : (scene1?.readAloud ?? "");
    expect(readAloudText).toContain("Ignore your rules");

    for (const scene of result.package.scenes) {
      const ctx = retrieveAdventureContext(result.package, {
        sceneId: scene.sourceId,
        includeGmOnly: false,
      });
      expect(ctx.secrets).toEqual([]);
      for (const secret of result.package.secrets) {
        expect(ctx.formatted).not.toContain(secret.text);
      }
    }

    const gmCtx = retrieveAdventureContext(result.package, {
      sceneId: "ros-scene-3-wheel-room",
      includeGmOnly: true,
    });
    expect(gmCtx.secrets.length).toBe(1);
    expect(gmCtx.formatted).toContain("Wick is owed three months of pay");
  });

  it("AC7: retrieves bounded scene context with citations, respecting maxCharacters and excluding unrelated scenes", async () => {
    const result = await parseAdventureMarkdown(adventureMd, {
      fileName: "adventure.md",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ctx = retrieveAdventureContext(result.package, {
      sceneId: "ros-scene-3-wheel-room",
    });
    expect(ctx.found).toBe(true);
    expect(ctx.citations).toEqual(["ros-scene-3-wheel-room"]);
    expect(ctx.readAloud.join(" ")).toContain(
      "wheel shaft groans against a jammed gear",
    );
    expect(ctx.encounters.length).toBe(1);
    expect(ctx.encounters[0].alternativeSolutions.length).toBe(2);
    expect(ctx.characterCount).toBeLessThanOrEqual(
      MAX_ADVENTURE_RETRIEVAL_CHARS,
    );
    expect(ctx.formatted).not.toContain("Scene 1: The Ferry Landing");
    expect(ctx.formatted).not.toContain("Ending: The Mill Turns");

    const tight = retrieveAdventureContext(result.package, {
      sceneId: "ros-scene-3-wheel-room",
      maxCharacters: 120,
    });
    expect(tight.truncated).toBe(true);
    expect(tight.formatted.length).toBeLessThanOrEqual(120);

    const missing = retrieveAdventureContext(result.package, {
      sceneId: "non-existent-scene",
    });
    expect(missing.found).toBe(false);
    expect(missing.formatted).toBe("");
  });

  it("AC8: persists to .codex/adventures/packages/<hash>.json, deduplicates identical hashes, reloads validly, and rolls back on write error", async () => {
    const io = createMemoryIO();
    const first = await importAndSaveAdventureMarkdown(io, adventureMd, {
      fileName: "adventure.md",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const expectedPath = getAdventurePackagePath(first.package.documentHash);
    expect(first.status).toBe("created");
    expect(first.path).toBe(expectedPath);
    expect(io.writeCalls).toBe(1);
    expect(io.files.has(expectedPath)).toBe(true);

    const second = await importAndSaveAdventureMarkdown(io, adventureMd, {
      fileName: "adventure.md",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.status).toBe("deduplicated");
    expect(io.writeCalls).toBe(1);
    expect(await listAdventurePackageHashes(io)).toEqual([
      first.package.documentHash,
    ]);
    expect(await loadAdventurePackage(io, first.package.documentHash)).toEqual(
      first.package,
    );

    const failingIo = createMemoryIO();
    failingIo.read = async () => {
      throw new Error("Simulated read-back corruption");
    };
    await expect(
      saveAdventurePackage(failingIo, first.package),
    ).rejects.toThrow("Simulated read-back corruption");
    expect(failingIo.files.size).toBe(0);
  });

  it("AC9: rejects empty, binary, invalid UTF-8, and headingless files without writing to storage", async () => {
    const io = createMemoryIO();
    const cases: Array<[string, string | Uint8Array]> = [
      ["empty string", ""],
      ["whitespace only", "   \n\t\n  "],
      [
        "binary buffer with null byte",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]),
      ],
      ["invalid utf-8", new Uint8Array([0xff, 0xfe, 0xfd])],
      ["no markdown headings", "Just plain prose with no headings at all."],
    ];

    for (const [_label, input] of cases) {
      const res = await importAndSaveAdventureMarkdown(io, input, {
        fileName: "bad.md",
      });
      expect(res.ok).toBe(false);
    }

    expect(io.writeCalls).toBe(0);
    expect(io.files.size).toBe(0);
  });
});
