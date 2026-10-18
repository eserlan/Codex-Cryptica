import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import releases from "../src/lib/content/changelog/releases.json";

describe("GitHub release packaging and notes", () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

  it("generates changelog notes without promoting a portable app download", () => {
    const notes = execFileSync("bun", ["scripts/generate-release-notes.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PREV_TAG: "",
        RELEASE_VERSION: releases[0].version,
      },
    });

    expect(notes).toContain(`## ${releases[0].title}`);
    expect(notes).toContain(releases[0].highlights[0].split(": ")[0]);
    expect(notes).not.toContain("Portable Codex");
    expect(notes).not.toMatch(/Download the `\.zip`/i);
  });

  it("does not attach a generated app zip to GitHub releases", () => {
    const workflow = readFileSync(
      resolve(repoRoot, ".github/workflows/release.yml"),
      "utf8",
    );

    expect(workflow).not.toContain("Create Portable Codex Zip");
    expect(workflow).not.toMatch(/files:\s*codex-cryptica-/);
  });
});
