import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const hookPath = resolve(".husky/pre-push");

function runHook(bunExitCode: number) {
  const tempDir = mkdtempSync(join(tmpdir(), "codex-pre-push-test-"));
  try {
    const repoDir = join(tempDir, "repo");
    const binDir = join(tempDir, "bin");
    mkdirSync(repoDir);
    mkdirSync(binDir);
    execFileSync("git", ["init", "-q", repoDir]);
    execFileSync("git", [
      "-C",
      repoDir,
      "config",
      "user.email",
      "test@example.com",
    ]);
    execFileSync("git", ["-C", repoDir, "config", "user.name", "Test"]);
    writeFileSync(join(repoDir, "README.md"), "base\n");
    execFileSync("git", ["-C", repoDir, "add", "README.md"]);
    execFileSync("git", ["-C", repoDir, "commit", "-qm", "base"]);
    const base = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
    writeFileSync(join(repoDir, "changed.ts"), "export {};\n");
    execFileSync("git", ["-C", repoDir, "add", "changed.ts"]);
    execFileSync("git", ["-C", repoDir, "commit", "-qm", "change"]);
    const head = execFileSync("git", ["-C", repoDir, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    const nodeMarker = join(tempDir, "node-called");
    writeFileSync(
      join(binDir, "bun"),
      `#!/bin/sh\nprintf '%s' "$*" > "${join(tempDir, "bun-called")}"\nexit ${bunExitCode}\n`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(binDir, "node"),
      `#!/bin/sh\ntouch "${nodeMarker}"\nexit 0\n`,
      { mode: 0o755 },
    );

    const result = spawnSync("sh", [hookPath], {
      cwd: repoDir,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: tempDir,
        PATH: `${binDir}${delimiter}${process.env.PATH}`,
      },
      input: `refs/heads/feature ${head} refs/heads/main ${base}\n`,
    });

    return {
      status: result.status,
      stderr: result.stderr,
      bunCalled: readFileSync(join(tempDir, "bun-called"), "utf8"),
      nodeWasCalled: (() => {
        try {
          readFileSync(nodeMarker);
          return true;
        } catch {
          return false;
        }
      })(),
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("pre-push hook runner", () => {
  test("runs the changed-file lint with Bun and succeeds", () => {
    const result = runHook(0);

    expect(result.status).toBe(0);
    expect(result.bunCalled).toContain("scripts/lint-changed.mjs --base");
    expect(result.nodeWasCalled).toBe(false);
  });

  test("preserves a lint failure instead of accepting the Node fallback", () => {
    const result = runHook(23);

    expect(result.status).toBe(23);
    expect(result.bunCalled).toContain("scripts/lint-changed.mjs --base");
    expect(result.nodeWasCalled).toBe(false);
  });
});
