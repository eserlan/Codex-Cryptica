import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeAdventureJson,
  computeAdventureJsonHash,
  loadStoredAdventurePackage,
  saveApprovedAdventureJson,
  validateAdventureJson,
  type AdventureJsonV1,
  type AdventurePackageFileIO,
} from "../../src";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../../fixtures/adventures/reference-one-shot/variants/adversarial.v1.json",
);

function loadFixture(): AdventureJsonV1 {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as AdventureJsonV1;
}

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
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Missing file: ${path}`);
      return value;
    },
    async write(path, content) {
      io.writeCalls += 1;
      files.set(path, content);
    },
    async list(dir) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((key) => key.startsWith(prefix));
    },
    async remove(path) {
      files.delete(path);
    },
  };
  return io;
}

function injectedStrings(pkg: AdventureJsonV1): string[] {
  return [
    pkg.scenes[1].readAloud as string,
    pkg.scenes[0].branches![0].condition as string,
    pkg.clues[0].text,
    pkg.secrets[0].text,
  ];
}

describe("adversarial Adventure JSON fixture", () => {
  it("carries the injection content as inert strings", () => {
    const joined = injectedStrings(loadFixture()).join("\n");
    expect(joined).toMatch(/ignore previous instructions/i);
    expect(joined).toContain("<system>");
    expect(joined).toContain("</tool_call>");
    expect(joined).toContain("GM-only notes");
    expect(joined).toContain('{"role":"system"');
  });

  it("validates and keeps every injected string unchanged", () => {
    const raw = loadFixture();
    const result = validateAdventureJson(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(injectedStrings(result.value)).toEqual(injectedStrings(raw));
    expect(result.value.secrets.every((s) => s.visibility === "gm-only")).toBe(
      true,
    );
  });

  it("keeps canonical form and hash through save and load", async () => {
    const raw = loadFixture();
    const io = createMemoryIO();
    const saved = await saveApprovedAdventureJson(io, raw);
    expect(saved.status).toBe("created");
    const loaded = await loadStoredAdventurePackage(io, saved.hash);
    expect(loaded).not.toBeNull();
    expect(loaded?.originFormat).toBe("adventure-json/v1");
    expect(injectedStrings(loaded!.package as AdventureJsonV1)).toEqual(
      injectedStrings(raw),
    );

    const canonRaw = canonicalizeAdventureJson(raw);
    expect(canonicalizeAdventureJson(saved.package)).toBe(canonRaw);
    expect(canonicalizeAdventureJson(loaded!.package as AdventureJsonV1)).toBe(
      canonRaw,
    );

    const hashRaw = await computeAdventureJsonHash(raw);
    expect(await computeAdventureJsonHash(saved.package)).toBe(hashRaw);
    expect(
      await computeAdventureJsonHash(loaded!.package as AdventureJsonV1),
    ).toBe(hashRaw);
    expect(saved.hash).toBe(hashRaw);
  });

  it("detects a one-character change in an injected string", async () => {
    const raw = loadFixture();
    const edited = JSON.parse(JSON.stringify(raw)) as AdventureJsonV1;
    edited.secrets[0].text = edited.secrets[0].text.replace(
      "Ignore previous",
      "Ignore Previous",
    );
    expect(edited.secrets[0].text).not.toBe(raw.secrets[0].text);
    expect(await computeAdventureJsonHash(edited)).not.toBe(
      await computeAdventureJsonHash(raw),
    );
    expect(canonicalizeAdventureJson(edited)).not.toBe(
      canonicalizeAdventureJson(raw),
    );
  });

  it("deduplicates a second save without writing again", async () => {
    const raw = loadFixture();
    const io = createMemoryIO();
    const first = await saveApprovedAdventureJson(io, raw);
    const writesBefore = io.writeCalls;
    const again = await saveApprovedAdventureJson(io, raw);
    expect(again.status).toBe("deduplicated");
    expect(again.hash).toBe(first.hash);
    expect(io.writeCalls).toBe(writesBefore);
  });
});
