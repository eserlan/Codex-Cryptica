import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADVENTURE_PREFLIGHT_HINTS,
  buildAdventureRepairPrompt,
  formatAdventurePreflightText,
  preflightAdventureJson,
  validateAdventureJson,
} from "../../src/adventure-json";

const root = resolve(import.meta.dir, "../../../..");
const read = (p: string) => readFileSync(resolve(root, p));

const VALID = [
  "apps/web/static/schemas/adventure-json/examples/minimal.v1.json",
  "apps/web/static/schemas/adventure-json/examples/reference-one-shot.v1.json",
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
  "fixtures/adventures/mystery/adventure.v1.json",
  "fixtures/adventures/keyed-sandbox/adventure.v1.json",
];
const SPARSE = "fixtures/adventures/reference-one-shot/variants/sparse.v1.json";
const dir = "fixtures/adventures/preflight/";
const INVALID: [string, string, string][] = [
  ["unresolved-reference.v1.json", "UNRESOLVED_REFERENCE", "integrity"],
  ["wrong-target.v1.json", "UNRESOLVED_REFERENCE", "integrity"],
  ["duplicate-id.v1.json", "DUPLICATE_ID", "integrity"],
  ["malformed-field.v1.json", "SCHEMA_VALIDATION_ERROR", "schema"],
];

describe("preflightAdventureJson", () => {
  it.each(VALID)("passes %s", (file) => {
    const report = preflightAdventureJson(read(file));
    expect(report.status).toBe("valid");
    expect(report.findings).toEqual([]);
    expect(report.sourceFidelity).toBe("not-checked");
  });

  it.each(INVALID)("%s agrees with the validator", (file, code, category) => {
    const bytes = read(dir + file);
    const report = preflightAdventureJson(bytes);
    expect(report.status).toBe("invalid");
    expect(report.findings[0]?.code).toBe(code);
    expect(report.findings[0]?.category).toBe(category);
    const result = validateAdventureJson(JSON.parse(bytes.toString("utf8")));
    if (result.ok) throw new Error("fixture should be invalid");
    expect(
      report.findings.map(({ code, message, path, entityId }) => ({
        code,
        message,
        path,
        entityId,
      })),
    ).toEqual(
      result.errors.map(({ code, message, path, entityId }) => ({
        code,
        message,
        path,
        entityId,
      })),
    );
  });

  it("is deterministic", () => {
    const bytes = read(dir + "duplicate-id.v1.json");
    expect(preflightAdventureJson(bytes)).toEqual(
      preflightAdventureJson(bytes),
    );
  });

  it("reports a single parse finding for truncated JSON", () => {
    const report = preflightAdventureJson(read(dir + "unparseable.json"));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.category).toBe("parse");
    expect(report.findings[0]?.code).toBe("JSON_PARSE_ERROR");
    expect(report.findings[0]?.path).toBeUndefined();
    expect(
      report.findings[0]?.message.startsWith("File is not valid JSON"),
    ).toBe(true);
  });

  it("strips a leading BOM from bytes", () => {
    const body = read(VALID[0] as string);
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...body]);
    expect(preflightAdventureJson(bytes).status).toBe("valid");
  });

  it("reports invalid UTF-8", () => {
    const report = preflightAdventureJson(new Uint8Array([0xff, 0xfe, 0x7b]));
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.code).toBe("JSON_PARSE_ERROR");
    expect(
      report.findings[0]?.message.startsWith("File is not valid UTF-8"),
    ).toBe(true);
  });

  it("accepts a string input", () => {
    expect(preflightAdventureJson("{").status).toBe("invalid");
  });

  it("sparse fixture is valid without claiming fidelity", () => {
    const report = preflightAdventureJson(read(SPARSE));
    expect(report.status).toBe("valid");
    expect(report.sourceFidelity).toBe("not-checked");
    const text = formatAdventurePreflightText(report);
    expect(text).toContain("Source fidelity: not checked");
    const claims = text
      .replace(/Source fidelity: not checked[^\n]*/, "")
      .toLowerCase();
    expect(claims).not.toMatch(/faithful|complete/);
    expect(buildAdventureRepairPrompt(report)).toBeNull();
  });
});

describe("ADVENTURE_PREFLIGHT_HINTS", () => {
  it("DEAD_END_CYCLE hint names the real fixes", () => {
    const hint = ADVENTURE_PREFLIGHT_HINTS.DEAD_END_CYCLE;
    expect(hint).toContain("optional");
    expect(hint).toContain("an unresolved entry does not clear this error");
  });
});

describe("buildAdventureRepairPrompt", () => {
  it("lists every finding and the preservation rules", () => {
    const base = JSON.parse(read(VALID[0] as string).toString("utf8"));
    base.scenes[0].locationId = "loc-missing";
    base.title = 7;
    base.actors[0].id = "loc-watchtower";
    const report = preflightAdventureJson(JSON.stringify(base));
    const second = JSON.parse(read(VALID[0] as string).toString("utf8"));
    second.actors[0].id = "loc-watchtower";
    second.scenes[0].locationId = "actor-x";
    const multi = preflightAdventureJson(JSON.stringify(second));
    for (const r of [report, multi]) {
      expect(r.findings.length).toBeGreaterThanOrEqual(1);
      const prompt = buildAdventureRepairPrompt(r) as string;
      for (const f of r.findings) {
        expect(prompt).toContain(f.code);
        expect(prompt).toContain(f.path ?? "(root)");
        expect(prompt).toContain(f.message);
      }
      expect(prompt).toContain("sourceRefs");
      expect(prompt).toContain("Do not bump version");
      expect(prompt).toContain("Do not invent");
      const lower = prompt.toLowerCase();
      expect(lower).toContain("fix only the listed errors");
      expect(lower).toContain(
        "return the complete corrected adventure json object",
      );
      expect(lower).toContain("run validation again");
      expect(prompt).toContain("Source fidelity was not checked");
    }
    expect(multi.findings.length).toBeGreaterThanOrEqual(2);
  });

  it("asks for well-formed JSON on a parse failure", () => {
    const prompt = buildAdventureRepairPrompt(
      preflightAdventureJson(read(dir + "unparseable.json")),
    ) as string;
    expect(prompt).toContain("well-formed JSON");
  });
});
