import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import {
  hasValidReviewStamp,
  writeReviewStamp,
} from "./codex-review-stamp.mjs";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("codex-review-stamp", () => {
  it("records and verifies the current HEAD SHA and rejects stale or missing stamps", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "codex-stamp-"));
    tempDirs.push(dir);
    const stampPath = path.join(dir, "codex-review-stamp");

    expect(hasValidReviewStamp("abc1234", stampPath)).toBe(false);
    writeReviewStamp("abc1234", stampPath);
    expect(hasValidReviewStamp("abc1234", stampPath)).toBe(true);
    expect(hasValidReviewStamp("def5678", stampPath)).toBe(false);
  });
});
