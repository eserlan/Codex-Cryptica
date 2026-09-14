import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapterPaths = [
  ".codex/skills/code-review/SKILL.md",
  ".claude/skills/code-review/SKILL.md",
  ".agents/skills/code-review/SKILL.md",
];
const commandPaths = [
  ".codex/commands/code-review.md",
  ".gemini/commands/code-review.toml",
];
const legacyReferencePaths = [
  ".agent/skills/codex-review/SKILL.md",
  ".agents/skills/review-and-fix/SKILL.md",
  ".claude/skills/review-and-fix/SKILL.md",
  "docs/devops/REVIEW_AND_FIX_AGENT.md",
];

describe("code-review skill layout", () => {
  it("keeps a canonical generic pass and routes every entrypoint through it", () => {
    const canonicalSkill = readFileSync(
      resolve(repositoryRoot, ".agent/skills/code-review/SKILL.md"),
      "utf8",
    );

    expect(canonicalSkill).toContain("## Finding Standard");
    expect(canonicalSkill).toContain("Trust and Security Boundaries");
    expect(canonicalSkill).toContain("Data and Compatibility");
    expect(canonicalSkill).toContain("Tests and Delivery");

    for (const adapterPath of adapterPaths) {
      expect(
        readFileSync(resolve(repositoryRoot, adapterPath), "utf8"),
      ).toContain("../../../.agent/skills/code-review/SKILL.md");
    }

    for (const commandPath of commandPaths) {
      const command = readFileSync(
        resolve(repositoryRoot, commandPath),
        "utf8",
      );
      expect(command).toContain("code-review");
      expect(command).toContain("codex-review");
    }

    for (const path of legacyReferencePaths) {
      expect(readFileSync(resolve(repositoryRoot, path), "utf8")).not.toContain(
        "code-review:code-review",
      );
    }
  });
});
