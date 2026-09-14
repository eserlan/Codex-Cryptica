import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPath = resolve(repositoryRoot, ".agent/skills/codex-review");
const adapterPaths = [
  ".codex/skills/codex-review/SKILL.md",
  ".claude/skills/codex-review/SKILL.md",
  ".agents/skills/codex-review/SKILL.md",
];

describe("codex-review skill layout", () => {
  it("keeps one canonical skill and thin compatibility adapters", () => {
    const canonicalSkill = readFileSync(
      resolve(canonicalPath, "SKILL.md"),
      "utf8",
    );

    expect(existsSync(resolve(canonicalPath, "references/patterns.md"))).toBe(
      true,
    );
    expect(canonicalSkill).toContain("REPORT_JSON:");

    for (const adapterPath of adapterPaths) {
      const adapter = readFileSync(
        resolve(repositoryRoot, adapterPath),
        "utf8",
      );
      expect(adapter).toContain("../../../.agent/skills/codex-review/SKILL.md");
      expect(adapter).not.toContain("## Required checks");
    }

    expect(
      existsSync(
        resolve(
          repositoryRoot,
          ".agents/skills/codex-review/references/patterns.md",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(
          repositoryRoot,
          ".claude/skills/codex-review/references/patterns.md",
        ),
      ),
    ).toBe(false);
  });
});
