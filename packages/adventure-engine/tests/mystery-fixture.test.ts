import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ConversionAnswerKeySchema } from "../src/adventure-json/conversion-score";
import { validateAdventureJson } from "../src/adventure-json/validator";

const dir = resolve(__dirname, "../../../fixtures/adventures/mystery");
const read = (file: string) => readFileSync(resolve(dir, file), "utf8");

const adventure = read("adventure.md");
const rawKey = JSON.parse(read("answer-key.json"));
const key = ConversionAnswerKeySchema.parse(rawKey);

const MARKER = /^<!-- source-id: ([a-z0-9-]+) -->$/gm;

const markerIds = (md: string) => [...md.matchAll(MARKER)].map((m) => m[1]);

function sectionBody(md: string, id: string): string {
  const start = md.indexOf(`<!-- source-id: ${id} -->`);
  if (start < 0) return "";
  const rest = md.slice(start);
  const next = rest.search(/^#{1,6} /m);
  return next < 0 ? rest : rest.slice(0, next);
}

const blockquoteLines = (md: string, label: string) =>
  md.split("\n").filter((l) => l.startsWith(`> **${label}:**`));

describe("mystery answer key schema", () => {
  it("parses the shipped key", () => {
    expect(ConversionAnswerKeySchema.safeParse(rawKey).success).toBe(true);
  });

  it.each([
    [
      "a conclusion with 2 clues",
      (k: any) => (k.conclusions[0].clues = k.conclusions[0].clues.slice(0, 2)),
    ],
    ["an unknown extra field", (k: any) => (k.extra = true)],
    ["a duplicate secret ID", (k: any) => (k.secrets[1].id = k.secrets[0].id)],
  ])("rejects a key with %s", (_name, mutate) => {
    const bad = structuredClone(rawKey);
    mutate(bad);
    expect(ConversionAnswerKeySchema.safeParse(bad).success).toBe(false);
  });
});

describe("mystery answer key against adventure.md", () => {
  const ids = new Set(markerIds(adventure));

  it("resolves every sourceId to a marker", () => {
    const used = [
      ...key.sections.map((s) => s.sourceId),
      ...key.npcs.map((n) => n.sourceId),
      ...key.secrets.map((s) => s.sourceId),
      ...key.sceneConditions.map((c) => c.sourceId),
      key.branch.sourceId,
      key.alternativeSolution.sourceId,
      key.alternativeSolution.obstacleSourceId,
      key.missableClue.primarySourceId,
      key.missableClue.alternativeSourceId,
      ...(key.conclusions ?? []).flatMap((c) =>
        c.clues.map((cl) => cl.sourceId),
      ),
      ...(key.testimonies ?? []).map((t) => t.sourceId),
      ...key.endings.map((e) => e.sourceId),
    ];
    for (const id of used) expect(ids.has(id)).toBe(true);
  });

  it("lists exactly the markers as sections", () => {
    expect(new Set(key.sections.map((s) => s.sourceId))).toEqual(ids);
    expect(markerIds(adventure).length).toBe(ids.size);
  });

  it("matches each title to the heading above its marker", () => {
    const lines = adventure.split("\n");
    for (const s of key.sections) {
      const at = lines.indexOf(`<!-- source-id: ${s.sourceId} -->`);
      let i = at - 1;
      while (i >= 0 && lines[i].trim() === "") i--;
      expect(lines[i].replace(/^#{1,6} /, "")).toBe(s.title);
    }
  });

  it("has GM-only secrets inside GM-only blockquotes of their section", () => {
    const gm = key.secrets.filter((s) => s.gmOnly);
    expect(gm.length).toBeGreaterThanOrEqual(2);
    const readAloud = blockquoteLines(adventure, "Read aloud").join("\n");
    for (const s of gm) {
      const quoted = blockquoteLines(
        sectionBody(adventure, s.sourceId),
        "GM only",
      );
      expect(quoted.some((l) => l.includes(s.text))).toBe(true);
      expect(readAloud.includes(s.text)).toBe(false);
    }
  });

  it("spreads each conclusion's clues over at least two sections", () => {
    for (const conclusion of key.conclusions ?? []) {
      expect(conclusion.clues.length).toBeGreaterThanOrEqual(3);
      expect(
        new Set(conclusion.clues.map((c) => c.sourceId)).size,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("has a testimony that contradicts the canonical fact", () => {
    expect((key.testimonies ?? []).some((t) => t.truth !== "true")).toBe(true);
  });

  it("has an optional branch", () => {
    expect(key.branch.optional).toBe(true);
  });

  it("has at least two endings", () => {
    expect(key.endings.length).toBeGreaterThanOrEqual(2);
  });
});

describe("mystery conversion", () => {
  it("passes validateAdventureJson", () => {
    const doc = JSON.parse(read("adventure.v1.json"));
    expect(validateAdventureJson(doc).ok).toBe(true);
  });
});
