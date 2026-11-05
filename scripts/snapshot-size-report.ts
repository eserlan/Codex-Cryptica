#!/usr/bin/env bun
/**
 * Prints a Markdown table of screenshot baseline sizes before and after an
 * update, for the PR opened by `.github/workflows/update-e2e-snapshots.yml`.
 * Sizes come from each PNG's IHDR header. A missing before file means the
 * baseline is new. Usage:
 *
 *   bun scripts/snapshot-size-report.ts <before> <after> [<before> <after> ...]
 */
import { existsSync, readFileSync } from "node:fs";

export interface PngSize {
  width: number;
  height: number;
}

export interface SnapshotPair {
  before: string;
  after: string;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function assertPngHeader(bytes: Uint8Array, label: string): void {
  if (
    bytes.length < 8 ||
    PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)
  )
    throw new Error(`${label} is not a PNG file.`);
  if (bytes.length < 24)
    throw new Error(`${label} is truncated before the end of its IHDR header.`);
}

function isIhdr(bytes: Uint8Array, view: DataView): boolean {
  return (
    view.getUint32(8) === 13 &&
    String.fromCharCode(...bytes.subarray(12, 16)) === "IHDR"
  );
}

/** Reads width and height from the IHDR chunk that must follow the PNG signature. */
export function readPngSize(bytes: Uint8Array, label = "file"): PngSize {
  assertPngHeader(bytes, label);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!isIhdr(bytes, view))
    throw new Error(`${label} does not start with an IHDR chunk.`);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0)
    throw new Error(`${label} has an invalid size of ${width}×${height}.`);
  return { width, height };
}

export function readPngSizeFromFile(path: string): PngSize {
  return readPngSize(readFileSync(path), path);
}

function formatSize(size: PngSize): string {
  return `${size.width}×${size.height}`;
}

/** Builds the table. Each row is labelled with the after path. */
export function buildSizeReport(pairs: SnapshotPair[]): string {
  const rows = pairs.map(({ before, after }) => {
    const beforeSize = existsSync(before)
      ? formatSize(readPngSizeFromFile(before))
      : "new";
    if (!existsSync(after)) throw new Error(`${after} does not exist.`);
    const afterSize = formatSize(readPngSizeFromFile(after));
    return `| \`${after}\` | ${beforeSize} → ${afterSize} |`;
  });
  return [
    "| Snapshot | Size (before → after) |",
    "| --- | --- |",
    ...rows,
  ].join("\n");
}

export function parseArgs(argv: string[]): SnapshotPair[] {
  if (argv.length === 0 || argv.length % 2 !== 0)
    throw new Error(
      "Usage: snapshot-size-report.ts <before> <after> [<before> <after> ...]",
    );
  const pairs: SnapshotPair[] = [];
  for (let index = 0; index < argv.length; index += 2)
    pairs.push({ before: argv[index]!, after: argv[index + 1]! });
  return pairs;
}

if (import.meta.main) {
  try {
    console.log(buildSizeReport(parseArgs(process.argv.slice(2))));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
