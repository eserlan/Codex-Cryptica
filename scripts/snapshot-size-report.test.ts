import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSizeReport,
  parseArgs,
  readPngSize,
  readPngSizeFromFile,
} from "./snapshot-size-report";

/** A PNG signature followed by an IHDR chunk; enough for the size reader. */
function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "snapshot-size-report-"));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writePng(name: string, width: number, height: number): string {
  const path = join(dir, name);
  writeFileSync(path, pngHeader(width, height));
  return path;
}

describe("readPngSize", () => {
  test("reads width and height from the IHDR header", () => {
    expect(readPngSize(pngHeader(380, 668))).toEqual({
      width: 380,
      height: 668,
    });
  });

  test("reads a real baseline from the repository", () => {
    const baseline = new URL(
      "../apps/web/tests/responsive-entity-panel.spec.ts-snapshots/entity-panel-ordinary-1280-chromium-linux.png",
      import.meta.url,
    ).pathname;
    expect(readPngSizeFromFile(baseline)).toEqual({ width: 380, height: 668 });
  });

  test("rejects a file that is not a PNG", () => {
    expect(() =>
      readPngSize(new TextEncoder().encode("not a png at all, just text"), "x"),
    ).toThrow("x is not a PNG file.");
  });

  test("rejects a PNG truncated inside its IHDR header", () => {
    expect(() => readPngSize(pngHeader(380, 668).subarray(0, 20), "x")).toThrow(
      "x is truncated before the end of its IHDR header.",
    );
  });

  test("rejects a PNG whose first chunk is not IHDR", () => {
    const bytes = pngHeader(380, 668);
    bytes.set([0x49, 0x44, 0x41, 0x54], 12);
    expect(() => readPngSize(bytes, "x")).toThrow(
      "x does not start with an IHDR chunk.",
    );
  });
});

describe("buildSizeReport", () => {
  test("renders a changed size and a new file", () => {
    const before = writePng("before.png", 380, 668);
    const after = writePng("after.png", 380, 683);
    const added = writePng("added.png", 380, 884);
    const report = buildSizeReport([
      { before, after },
      { before: join(dir, "missing.png"), after: added },
    ]);
    expect(report.split("\n")).toEqual([
      "| Snapshot | Size (before → after) |",
      "| --- | --- |",
      `| \`${after}\` | 380×668 → 380×683 |`,
      `| \`${added}\` | new → 380×884 |`,
    ]);
  });

  test("fails clearly when the after file is not a PNG", () => {
    const before = writePng("before-2.png", 380, 668);
    const after = join(dir, "after.txt");
    writeFileSync(after, "hello");
    expect(() => buildSizeReport([{ before, after }])).toThrow(
      `${after} is not a PNG file.`,
    );
  });

  test("fails when the after file is missing", () => {
    const before = writePng("before-3.png", 380, 668);
    const after = join(dir, "gone.png");
    expect(() => buildSizeReport([{ before, after }])).toThrow(
      `${after} does not exist.`,
    );
  });
});

describe("parseArgs", () => {
  test("pairs before and after paths", () => {
    expect(parseArgs(["a", "b", "c", "d"])).toEqual([
      { before: "a", after: "b" },
      { before: "c", after: "d" },
    ]);
  });

  test.each([[[]], [["a"]], [["a", "b", "c"]]])("rejects %j", (argv) => {
    expect(() => parseArgs(argv)).toThrow("Usage:");
  });
});
