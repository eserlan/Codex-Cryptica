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
const commandPaths = [
  ".codex/commands/code-review.md",
  ".gemini/commands/code-review.toml",
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
    const patterns = readFileSync(
      resolve(canonicalPath, "references/patterns.md"),
      "utf8",
    );
    expect(canonicalSkill).toContain("REPORT_JSON:");
    expect(canonicalSkill).toContain("constitution");
    expect(canonicalSkill).toContain("privacy and security boundaries");
    expect(canonicalSkill).toContain("meaningful failure");
    expect(canonicalSkill).toContain("documentation and spec artifacts");
    expect(canonicalSkill).toContain("bun run --cwd apps/web build");
    expect(canonicalSkill).not.toContain("bun --cwd apps/web run build");
    expect(canonicalSkill).toContain("Component Mount Hierarchy");
    expect(canonicalSkill).toContain(
      "Untrusted Markdown & Privacy (Constitution IV)",
    );
    expect(canonicalSkill).toContain("Canvas 2D / 60 FPS Render Budgets");
    expect(canonicalSkill).toContain("Adversarial Premise Inversion");
    expect(canonicalSkill).toContain("Multi-Theme Contrast");
    expect(canonicalSkill).toContain(
      'Assertion Completeness (Not Just "Tests Pass")',
    );

    expect(patterns).toContain("## Trust, Privacy & Public Boundaries");
    expect(patterns).toContain("AI Output Is Untrusted Input");
    expect(patterns).toContain("AbortSignal");
    expect(patterns).toContain("renderMarkdown");
    expect(patterns).toContain("Persisted Schema and Migration Compatibility");
    expect(patterns).toContain("onclick={openLightbox}");
    expect(patterns).not.toContain('onclick="{openLightbox}"');
    expect(patterns).toContain(
      "Component Mount Hierarchy vs Navigation Lifecycles",
    );
    expect(patterns).toContain("Domain Grounding & Fact Consistency");
    expect(patterns).toContain("Remote Tracking (Constitution IV)");
    expect(patterns).toContain(
      "Multi-Theme Optical Contrast on Semi-Transparent Overlays",
    );
    expect(patterns).toContain(
      "Debounce Timers & Async Invalidation Lifecycle",
    );
    expect(patterns).toContain(
      "Canvas 2D Hot-Path Compositing & 60 FPS Budgets",
    );
    expect(patterns).toContain(
      "Adversarial Premise Inversion in Optimizations",
    );
    expect(patterns).toContain(
      'Assertion Completeness (Not Just "Tests Pass")',
    );

    for (const adapterPath of adapterPaths) {
      const adapter = readFileSync(
        resolve(repositoryRoot, adapterPath),
        "utf8",
      );
      expect(adapter).toContain("../../../.agent/skills/codex-review/SKILL.md");
      expect(adapter).not.toContain("## Required checks");
    }

    for (const commandPath of commandPaths) {
      expect(
        readFileSync(resolve(repositoryRoot, commandPath), "utf8"),
      ).toContain("REPORT_JSON:");
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
