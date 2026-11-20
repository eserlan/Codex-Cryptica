import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");

const run = (args: string[]) =>
  spawnSync(
    "bun",
    [resolve(root, "scripts/score-adventure-conversion.ts"), ...args],
    {
      encoding: "utf8",
      cwd: root,
    },
  );

const readJson = (rel: string) =>
  JSON.parse(readFileSync(resolve(root, rel), "utf8"));

const createAuthorityCase = () => {
  const directory = mkdtempSync(resolve(tmpdir(), "conversion-score-"));
  const doc = readJson(
    "fixtures/adventures/reference-one-shot/adventure.v1.json",
  );
  const key = {
    ...readJson("fixtures/adventures/reference-one-shot/answer-key.json"),
    ...readJson(
      "fixtures/adventures/reference-one-shot/variants/source-authority-answer-key.json",
    ),
  };
  const opening = doc.scenes.find(
    (scene: { id: string }) => scene.id === "ros-scene-1-landing",
  );
  doc.title = "The Reed Watch";
  doc.source.title = "The Reed Watch";
  doc.items = [];
  for (const secret of doc.secrets) {
    secret.relatedEntityIds = secret.relatedEntityIds.filter(
      (id: string) => !id.startsWith("item-"),
    );
  }
  opening.body = "The watch opens at noon.";
  opening.sourceRef.page = 4;
  opening.sourceRef.section = "PDF page 4";

  const conversionPath = resolve(directory, "conversion.json");
  const keyPath = resolve(directory, "answer-key.json");
  writeFileSync(conversionPath, JSON.stringify(doc));
  writeFileSync(keyPath, JSON.stringify(key));
  return { directory, conversionPath, keyPath };
};

const REF_CONV = "fixtures/adventures/reference-one-shot/adventure.v1.json";
const REF_KEY = "fixtures/adventures/reference-one-shot/answer-key.json";
const SPARSE = "fixtures/adventures/reference-one-shot/variants/sparse.v1.json";
const CLAUDE = "fixtures/adventures/conversions/claude-adventure.v1.json";

describe("score-adventure-conversion CLI", () => {
  it("exits 0 and prints every dimension for the reference conversion", () => {
    const result = run([REF_CONV, REF_KEY]);
    expect(result.status).toBe(0);
    for (const dim of [
      "schema",
      "references",
      "secrets",
      "sourceAuthority",
      "conflicts",
      "coverage",
      "authoredVsRumour",
      "branches",
      "citations",
      "truncation",
      "fidelity",
    ]) {
      expect(result.stdout).toContain(dim);
    }
  });

  it("exits 1 and prints fidelity: fail for the sparse variant", () => {
    const result = run([SPARSE, REF_KEY]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fidelity: fail");
  });

  it("exits 1 for the existing claude fixture", () => {
    const result = run([CLAUDE, REF_KEY]);
    expect(result.status).toBe(1);
  });

  it("exits 2 with a missing argument", () => {
    const result = run([REF_CONV]);
    expect(result.status).toBe(2);
  });

  it("exits 2 with usage for an unsupported option", () => {
    const result = run([REF_CONV, REF_KEY, "--bogus"]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).not.toContain("at parseArgs");
  });

  it("--json prints parseable JSON containing overall", () => {
    const result = run([REF_CONV, REF_KEY, "--json"]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty("overall", "pass");
  });

  it("prints the source-authority score in human-readable and JSON output", () => {
    const authorityCase = createAuthorityCase();
    try {
      const human = run([authorityCase.conversionPath, authorityCase.keyPath]);
      expect(human.status).toBe(0);
      expect(human.stdout).toContain("sourceAuthority: pass");

      const json = run([
        authorityCase.conversionPath,
        authorityCase.keyPath,
        "--json",
      ]);
      expect(json.status).toBe(0);
      expect(JSON.parse(json.stdout).dimensions.sourceAuthority.status).toBe(
        "pass",
      );
    } finally {
      rmSync(authorityCase.directory, { recursive: true, force: true });
    }
  });
});
