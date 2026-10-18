import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { format } from "prettier";

const fixtures: string[] = [];
const repo = resolve(import.meta.dir, "..");

afterEach(() => {
  for (const fixture of fixtures.splice(0))
    rmSync(fixture, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "cc-speckit-test-"));
  fixtures.push(root);
  cpSync(join(repo, ".specify/scripts"), join(root, ".specify/scripts"), {
    recursive: true,
  });
  cpSync(join(repo, ".specify/templates"), join(root, ".specify/templates"), {
    recursive: true,
  });
  cpSync(join(repo, ".specify/extensions"), join(root, ".specify/extensions"), {
    recursive: true,
  });
  cpSync(join(repo, ".specify/presets"), join(root, ".specify/presets"), {
    recursive: true,
  });
  mkdirSync(join(root, "specs/001-example"), { recursive: true });
  writeFileSync(join(root, "specs/001-example/spec.md"), "# Example\n");
  writeFileSync(
    join(root, ".specify/feature.json"),
    JSON.stringify({ feature_directory: "specs/001-example" }),
  );
  return root;
}

function run(
  root: string,
  script: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  return Bun.spawnSync(
    ["bash", join(root, ".specify/scripts/bash", script), ...args],
    {
      cwd: root,
      env: {
        ...process.env,
        SPECIFY_INIT_DIR: root,
        SPECIFY_FEATURE: "",
        SPECIFY_FEATURE_DIRECTORY: "",
        SPECIFY_FEATURE_NO_PERSIST: "",
        ...env,
      },
    },
  );
}

describe("Spec Kit project scripts", () => {
  test("legacy context updater uses explicit feature state and reports a missing plan", () => {
    const root = fixture();
    const missing = run(root, "update-agent-context.sh", ["codex"]);
    expect(missing.exitCode).not.toBe(0);
    expect(missing.stderr.toString()).toContain("No plan.md found");
    expect(missing.stderr.toString()).not.toContain("unbound variable");
    expect(existsSync(join(root, "AGENTS.md"))).toBe(false);
    writeFileSync(
      join(root, "specs/001-example/plan.md"),
      "# Plan\n\n**Language/Version**: TypeScript\n",
    );
    const result = run(root, "update-agent-context.sh", ["codex"]);
    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(root, "AGENTS.md"), "utf8")).toContain(
      "001-example",
    );
  });

  test("creates a plan with parseable JSON and preserves it on a repeated run", () => {
    const root = fixture();
    const first = run(root, "setup-plan.sh", ["--json"]);
    expect(first.exitCode).toBe(0);
    expect(JSON.parse(first.stdout.toString()).FEATURE_DIR).toBe(
      join(root, "specs/001-example"),
    );
    const plan = join(root, "specs/001-example/plan.md");
    writeFileSync(plan, "# Reviewed plan\n");
    expect(run(root, "setup-plan.sh", ["--json"]).exitCode).toBe(0);
    expect(readFileSync(plan, "utf8")).toBe("# Reviewed plan\n");
  });

  test("rejects unknown plan options without writing a plan", () => {
    const root = fixture();
    const result = run(root, "setup-plan.sh", ["--typo"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("Unknown option");
    expect(() =>
      readFileSync(join(root, "specs/001-example/plan.md")),
    ).toThrow();
  });

  test("requires a specification when requested", () => {
    const root = fixture();
    writeFileSync(join(root, "specs/001-example/plan.md"), "# Plan\n");
    expect(
      run(root, "check-prerequisites.sh", ["--json", "--require-spec"])
        .exitCode,
    ).toBe(0);
    rmSync(join(root, "specs/001-example/spec.md"));
    const result = run(root, "check-prerequisites.sh", [
      "--json",
      "--require-spec",
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("spec.md not found");
  });

  test("resolves explicit feature paths without changing persisted feature state", () => {
    const root = fixture();
    const state = join(root, ".specify/feature.json");
    const before = readFileSync(state, "utf8");
    const result = run(
      root,
      "check-prerequisites.sh",
      ["--json", "--paths-only"],
      { SPECIFY_FEATURE_DIRECTORY: "specs/002-other" },
    );
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString()).FEATURE_DIR).toBe(
      join(root, "specs/002-other"),
    );
    expect(readFileSync(state, "utf8")).toBe(before);
  });

  test("rejects a project override with no Spec Kit directory", () => {
    const root = fixture();
    const result = run(
      root,
      "check-prerequisites.sh",
      ["--json", "--paths-only"],
      { SPECIFY_INIT_DIR: join(root, "specs") },
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("not a Spec Kit project");
  });

  test("creates feature files separately and advances conflicting numbers without overwriting", () => {
    const root = fixture();
    const result = run(root, "create-new-feature.sh", [
      "--json",
      "--number",
      "2",
      "--short-name",
      "example",
      "Example",
    ]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString()).BRANCH_NAME).toBe(
      "002-example",
    );
    expect(existsSync(join(root, "specs/002-example/spec.md"))).toBe(true);
    writeFileSync(
      join(root, "specs/002-example/spec.md"),
      "# Reviewed specification\n",
    );
    const again = run(root, "create-new-feature.sh", [
      "--json",
      "--number",
      "2",
      "--short-name",
      "example",
      "Example",
    ]);
    expect(again.exitCode).toBe(0);
    expect(JSON.parse(again.stdout.toString()).BRANCH_NAME).toBe("003-example");
    expect(readFileSync(join(root, "specs/002-example/spec.md"), "utf8")).toBe(
      "# Reviewed specification\n",
    );
  });

  test("rejects invalid feature numbers without changing persisted state", () => {
    const root = fixture();
    const before = readFileSync(join(root, ".specify/feature.json"), "utf8");
    const result = run(root, "create-new-feature.sh", [
      "--json",
      "--number",
      "invalid",
      "Example",
    ]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("unsigned integer");
    expect(readFileSync(join(root, ".specify/feature.json"), "utf8")).toBe(
      before,
    );
  });

  test("reports invalid preset composition without leaving a partial plan", () => {
    const root = fixture();
    writeFileSync(
      join(root, ".specify/presets/constitution-sync/preset.yml"),
      "provides: [invalid\n",
    );
    const result = run(root, "setup-plan.sh", ["--json"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("invalid preset manifest");
    expect(existsSync(join(root, "specs/001-example/plan.md"))).toBe(false);
  });

  test("feature creation dry-run does not write files or feature state", () => {
    const root = fixture();
    const before = readFileSync(join(root, ".specify/feature.json"), "utf8");
    const result = run(root, "create-new-feature.sh", [
      "--json",
      "--dry-run",
      "--number",
      "2",
      "--short-name",
      "example",
      "Example",
    ]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString()).DRY_RUN).toBe(true);
    expect(existsSync(join(root, "specs/002-example"))).toBe(false);
    expect(readFileSync(join(root, ".specify/feature.json"), "utf8")).toBe(
      before,
    );
  });

  test("Git extension creates only a branch and rejects an invalid branch name", () => {
    const root = fixture();
    expect(Bun.spawnSync(["git", "init", "-q"], { cwd: root }).exitCode).toBe(
      0,
    );
    expect(
      Bun.spawnSync(
        [
          "git",
          "-c",
          "user.name=Spec Kit Test",
          "-c",
          "user.email=test@example.invalid",
          "commit",
          "--allow-empty",
          "-qm",
          "Initial",
        ],
        { cwd: root },
      ).exitCode,
    ).toBe(0);
    const script = join(
      root,
      ".specify/extensions/git/scripts/bash/create-new-feature-branch.sh",
    );
    const create = (name: string) =>
      Bun.spawnSync(["bash", script, "--json", "Example"], {
        cwd: root,
        env: { ...process.env, SPECIFY_INIT_DIR: root, GIT_BRANCH_NAME: name },
      });
    expect(create("002-example").exitCode).toBe(0);
    expect(existsSync(join(root, "specs/002-example"))).toBe(false);
    expect(create("invalid name").exitCode).not.toBe(0);
    expect(
      Bun.spawnSync(["git", "branch", "--show-current"], { cwd: root })
        .stdout.toString()
        .trim(),
    ).toBe("002-example");
  });

  test("Git hooks preserve disabled auto-commit and report missing message files", () => {
    const root = fixture();
    expect(Bun.spawnSync(["git", "init", "-q"], { cwd: root }).exitCode).toBe(
      0,
    );
    const script = join(
      root,
      ".specify/extensions/git/scripts/bash/auto-commit.sh",
    );
    const before = Bun.spawnSync(["git", "status", "--porcelain"], {
      cwd: root,
    }).stdout.toString();
    const result = Bun.spawnSync(["bash", script, "after_plan"], { cwd: root });
    expect(result.exitCode).toBe(0);
    expect(
      Bun.spawnSync(["git", "status", "--porcelain"], {
        cwd: root,
      }).stdout.toString(),
    ).toBe(before);
    const invalid = Bun.spawnSync(
      [
        "bash",
        script,
        "after_plan",
        "--message-file",
        join(root, "missing.txt"),
      ],
      { cwd: root },
    );
    expect(invalid.exitCode).not.toBe(0);
    expect(invalid.stderr.toString()).toContain("not found");
  });
});

describe("Spec Kit command integration", () => {
  test("canonical Gemini prompts agree with Markdown, Codex, and skill compatibility copies", async () => {
    for (const name of readdirSync(join(repo, ".gemini/commands")).filter(
      (name) => /^speckit\..+\.toml$/.test(name),
    )) {
      const canonical = Bun.TOML.parse(
        readFileSync(join(repo, ".gemini/commands", name), "utf8"),
      ) as { description: string; prompt: string };
      const command = name.replace(/\.toml$/, "");
      const prompt = canonical.prompt.replaceAll("{{args}}", "$ARGUMENTS");
      const markdown = `---\ndescription: ${canonical.description}\n---\n${prompt}`;
      const expectedMarkdown = await format(markdown, { parser: "markdown" });
      expect(
        await format(
          readFileSync(join(repo, ".gemini/commands", `${command}.md`), "utf8"),
          { parser: "markdown" },
        ),
      ).toBe(expectedMarkdown);
      if (!command.startsWith("speckit.git."))
        expect(
          await format(
            readFileSync(
              join(repo, ".codex/commands", `${command}.md`),
              "utf8",
            ),
            { parser: "markdown" },
          ),
        ).toBe(expectedMarkdown);
      const skill = join(
        repo,
        ".agents/skills",
        command.replaceAll(".", "-"),
        "SKILL.md",
      );
      const skillBody = readFileSync(skill, "utf8").replace(
        /^---\n[\s\S]*?\n---\n/,
        "",
      );
      const expectedBody = prompt.replace(
        /\/speckit\.([a-z.]+)/g,
        (_match, step: string) => `/speckit-${step.replaceAll(".", "-")}`,
      );
      expect(await format(skillBody, { parser: "markdown" })).toBe(
        await format(expectedBody, { parser: "markdown" }),
      );
    }
  });

  test("constitution propagation is composed while repo validation rules override upstream defaults", () => {
    const constitution = readFileSync(
      join(repo, ".gemini/commands/speckit.constitution.toml"),
      "utf8",
    );
    expect(constitution).toContain("## Constitution Template Sync");
    expect(constitution).not.toContain("{CORE_TEMPLATE}");
    const tasks = readFileSync(
      join(repo, ".gemini/commands/speckit.tasks.toml"),
      "utf8",
    );
    expect(tasks).toContain(
      "**Tests are REQUIRED for changed code behaviour**",
    );
    expect(tasks).toContain("quote the constraint verbatim");
    expect(tasks).not.toContain("**Tests are OPTIONAL**");
    const implement = readFileSync(
      join(repo, ".gemini/commands/speckit.implement.toml"),
      "utf8",
    );
    expect(implement).toContain("bun run test:changed");
    expect(implement).toContain("bun run lint:changed");
  });
});
