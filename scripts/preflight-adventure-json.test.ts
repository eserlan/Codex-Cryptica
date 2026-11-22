import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { MAX_ADVENTURE_JSON_BYTES } from "../packages/adventure-engine/src/adventure-json/storage";

const root = resolve(__dirname, "..");

const run = (args: string[]) =>
  spawnSync(
    "bun",
    [resolve(root, "scripts/preflight-adventure-json.ts"), ...args],
    { encoding: "utf8", cwd: root },
  );

const MINIMAL =
  "apps/web/static/schemas/adventure-json/examples/minimal.v1.json";
const DIR = "fixtures/adventures/preflight/";

describe("preflight-adventure-json CLI", () => {
  it("exits 0 on a valid fixture", () => {
    const result = run([MINIMAL]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Source fidelity: not checked");
  });

  it.each([
    "unresolved-reference.v1.json",
    "wrong-target.v1.json",
    "duplicate-id.v1.json",
    "malformed-field.v1.json",
    "unparseable.json",
  ])("exits 1 on %s", (file) => {
    expect(run([DIR + file]).status).toBe(1);
  });

  it("exits 2 with no arguments, an unknown option or a missing file", () => {
    for (const args of [[], [MINIMAL, "--bogus"], ["does-not-exist.json"]]) {
      const result = run(args);
      expect(result.status).toBe(2);
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });

  it("rejects files above the import size limit before parsing", () => {
    const directory = mkdtempSync(join(tmpdir(), "adventure-preflight-"));
    const file = join(directory, "oversized.json");
    try {
      writeFileSync(file, "");
      truncateSync(file, MAX_ADVENTURE_JSON_BYTES + 1);
      const result = run([file]);
      expect(result.status).toBe(2);
      expect(result.stderr).toContain(
        "Adventure JSON files must be 10 MiB or smaller.",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("prints parseable JSON with --json", () => {
    const result = run([DIR + "wrong-target.v1.json", "--json"]);
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.status).toBe("invalid");
    expect(report.sourceFidelity).toBe("not-checked");
    expect(report.findings[0].code).toBe("UNRESOLVED_REFERENCE");
  });

  it("adds repairPrompt to --json and prints it as text otherwise", () => {
    const json = JSON.parse(
      run([DIR + "duplicate-id.v1.json", "--json", "--repair-prompt"]).stdout,
    );
    expect(json.repairPrompt).toContain("DUPLICATE_ID");
    const text = run([DIR + "duplicate-id.v1.json", "--repair-prompt"]);
    expect(text.stdout).toContain("DUPLICATE_ID");
    expect(text.stdout).toContain("REPAIR PROMPT START");
    expect(run([MINIMAL, "--repair-prompt"]).stdout).not.toContain(
      "REPAIR PROMPT START",
    );
  });

  it("does not change the input or the folder", () => {
    const file = resolve(root, DIR + "duplicate-id.v1.json");
    const before = [readFileSync(file), statSync(file).mtimeMs];
    const names = readdirSync(resolve(root, DIR)).sort();
    run([DIR + "duplicate-id.v1.json", "--repair-prompt"]);
    expect([readFileSync(file), statSync(file).mtimeMs]).toEqual(before);
    expect(readdirSync(resolve(root, DIR)).sort()).toEqual(names);
  });
});
