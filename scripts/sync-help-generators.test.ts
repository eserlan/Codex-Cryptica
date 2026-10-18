import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { syncHelpGenerators } from "./sync-help-generators";

const temporaryDirectories: string[] = [];

function createFixture(exitCode: number, executableName = "controlled-bunx") {
  const root = mkdtempSync(join(tmpdir(), "sync-help-generators-"));
  temporaryDirectories.push(root);

  const binDirectory = join(root, "bin");
  const outputDirectory = join(root, "packages/help-engine/src/registry");
  const logPath = join(root, "formatter.log");
  const cwdPath = join(root, "formatter.cwd");
  const executable = join(binDirectory, executableName);

  mkdirSync(binDirectory, { recursive: true });
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    executable,
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${logPath}"\nprintf '%s' "$PWD" > "${cwdPath}"\nexit ${exitCode}\n`,
  );
  chmodSync(executable, 0o755);

  return {
    root,
    executable,
    logPath,
    cwdPath,
    outputPath: join(outputDirectory, "generators.generated.ts"),
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("syncHelpGenerators formatter", () => {
  test("uses bunx by default", () => {
    const fixture = createFixture(0, "bunx");
    const originalPath = process.env.PATH;
    process.env.PATH = [join(fixture.root, "bin"), originalPath]
      .filter(Boolean)
      .join(delimiter);

    try {
      syncHelpGenerators({ root: fixture.root });
    } finally {
      if (originalPath === undefined) {
        delete process.env.PATH;
      } else {
        process.env.PATH = originalPath;
      }
    }

    expect(readFileSync(fixture.logPath, "utf8").trim().split("\n")).toEqual([
      "prettier",
      "--write",
      fixture.outputPath,
    ]);
    expect(readFileSync(fixture.cwdPath, "utf8")).toBe(fixture.root);
  });

  test("invokes bunx with Prettier in the configured repository root", () => {
    const fixture = createFixture(0);

    const result = syncHelpGenerators({
      root: fixture.root,
      formatterExecutable: fixture.executable,
    });

    expect(readFileSync(fixture.logPath, "utf8").trim().split("\n")).toEqual([
      "prettier",
      "--write",
      fixture.outputPath,
    ]);
    expect(readFileSync(fixture.cwdPath, "utf8")).toBe(fixture.root);
    expect(result).toEqual({
      count: expect.any(Number),
      output: "packages/help-engine/src/registry/generators.generated.ts",
    });
  });

  test("propagates formatter failure after writing the generated registry", () => {
    const fixture = createFixture(23);

    expect(() =>
      syncHelpGenerators({
        root: fixture.root,
        formatterExecutable: fixture.executable,
      }),
    ).toThrow();

    expect(readFileSync(fixture.outputPath, "utf8")).toContain(
      "export const GENERATORS =",
    );
    expect(readFileSync(fixture.logPath, "utf8")).toContain("--write");
  });
});
