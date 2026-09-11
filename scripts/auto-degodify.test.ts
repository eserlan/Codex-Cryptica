import { describe, it, expect } from "vitest";
import {
  selectDegodifyCandidate,
  buildDecompositionPrompt,
  AGENT_PROVIDERS,
  resolveAgentExecutable,
  resolveConfiguredProviders,
} from "./auto-degodify.ts";
import type { FileAnalysis } from "./god-file-analysis.ts";

describe("auto-degodify", () => {
  const sampleFiles: FileAnalysis[] = [
    {
      path: "/repo/packages/schema/src/silhouettes.ts",
      relativePath: "packages/schema/src/silhouettes.ts",
      totalLines: 2400,
      codeLines: 2300,
      functionCount: 0,
      type: "Data Catalog",
      isDataCatalog: true,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/components/Canvas.svelte",
      relativePath: "apps/web/src/components/Canvas.svelte",
      totalLines: 1800,
      codeLines: 1600,
      functionCount: 50,
      type: "UI Component",
      isDataCatalog: false,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/components/Editor.svelte",
      relativePath: "apps/web/src/components/Editor.svelte",
      totalLines: 1200,
      codeLines: 1000,
      functionCount: 30,
      type: "UI Component",
      isDataCatalog: false,
      status: "CRITICAL",
    },
    {
      path: "/repo/apps/web/src/stores/small.ts",
      relativePath: "apps/web/src/stores/small.ts",
      totalLines: 300,
      codeLines: 200,
      functionCount: 5,
      type: "Store (State)",
      isDataCatalog: false,
      status: "STABLE",
    },
  ];

  describe("selectDegodifyCandidate", () => {
    it("skips data catalogs and picks worst eligible god file", () => {
      const selection = selectDegodifyCandidate(sampleFiles, []);
      expect(selection.candidate).not.toBeNull();
      expect(selection.candidate?.relativePath).toBe(
        "apps/web/src/components/Canvas.svelte",
      );
    });

    it("skips files that have active branch or PR conflicts", () => {
      const active = ["curator/degod-canvas-svelte-12345"];
      const selection = selectDegodifyCandidate(sampleFiles, active);
      expect(selection.candidate?.relativePath).toBe(
        "apps/web/src/components/Editor.svelte",
      );
      expect(selection.skipped.length).toBe(1);
      expect(selection.skipped[0].reason).toContain("canvas.svelte");
    });

    it("returns null candidate when all critical/watch files are active or skipped", () => {
      const active = ["canvas.svelte", "editor.svelte"];
      const selection = selectDegodifyCandidate(sampleFiles, active);
      expect(selection.candidate).toBeNull();
    });
  });

  describe("buildDecompositionPrompt", () => {
    it("generates instructions with target file, branch, and quality gates", () => {
      const prompt = buildDecompositionPrompt(
        sampleFiles[1],
        "curator/degod-canvas-123",
        "staging",
      );

      expect(prompt).toContain(
        "TARGET FILE: apps/web/src/components/Canvas.svelte",
      );
      expect(prompt).toContain("curator/degod-canvas-123");
      expect(prompt).toContain("Constitution Principle XIV");
      expect(prompt).toContain("bun test");
      expect(prompt).toContain("bun run lint:types");
      expect(prompt).toContain("bun run lint");
      expect(prompt).toContain("--no-verify");
      expect(prompt).toContain("gh pr create --base staging");
    });
  });

  describe("multi-provider fallback", () => {
    it("defines valid configurations for agy, claude, and codex", () => {
      expect(AGENT_PROVIDERS.agy).toBeDefined();
      expect(AGENT_PROVIDERS.claude).toBeDefined();
      expect(AGENT_PROVIDERS.codex).toBeDefined();

      const agyArgs = AGENT_PROVIDERS.agy.getArgs("test-prompt", 15);
      expect(agyArgs).toContain("--print");
      expect(agyArgs).toContain("test-prompt");
      expect(agyArgs).toContain("--effort=medium");
      expect(agyArgs).toContain("--dangerously-skip-permissions");
      expect(agyArgs).toContain("--print-timeout=15m0s");

      const claudeArgs = AGENT_PROVIDERS.claude.getArgs("test-prompt", 15);
      expect(claudeArgs).toContain("-p");
      expect(claudeArgs).toContain("test-prompt");
      expect(claudeArgs).toContain("--model");
      expect(claudeArgs).toContain("sonnet");
      expect(claudeArgs).toContain("--effort");
      expect(claudeArgs).toContain("medium");
      expect(claudeArgs).toContain("--dangerously-skip-permissions");

      const previousModel = process.env.CODEX_MODEL;
      delete process.env.CODEX_MODEL;
      try {
        const codexArgs = AGENT_PROVIDERS.codex.getArgs("test-prompt", 15);
        expect(codexArgs).toContain("exec");
        expect(codexArgs).toContain("-m");
        expect(codexArgs).toContain("gpt-5.6-luna");
        expect(codexArgs).toContain("-c");
        expect(codexArgs).toContain('model_reasoning_effort="medium"');
        expect(codexArgs).toContain(
          "--dangerously-bypass-approvals-and-sandbox",
        );
        expect(codexArgs).toContain("test-prompt");
      } finally {
        if (previousModel !== undefined) {
          process.env.CODEX_MODEL = previousModel;
        } else {
          delete process.env.CODEX_MODEL;
        }
      }

      process.env.CODEX_MODEL = "gpt-5.6-custom";
      try {
        const customArgs = AGENT_PROVIDERS.codex.getArgs("test-prompt", 15);
        expect(customArgs).toContain("gpt-5.6-custom");
      } finally {
        if (previousModel !== undefined) {
          process.env.CODEX_MODEL = previousModel;
        } else {
          delete process.env.CODEX_MODEL;
        }
      }
    });

    it("resolves available agent executables on system", () => {
      // At least one of the supported agents should be resolvable on this environment
      const agyPath = resolveAgentExecutable("agy");
      const claudePath = resolveAgentExecutable("claude");
      const codexPath = resolveAgentExecutable("codex");

      expect(agyPath || claudePath || codexPath).toBeTruthy();
    });

    it("returns null for unknown provider", () => {
      // @ts-expect-error Testing invalid provider
      expect(resolveAgentExecutable("unknown-agent")).toBeNull();
    });
  });

  describe("resolveConfiguredProviders", () => {
    it("returns defaults when unset", () => {
      expect(resolveConfiguredProviders(undefined)).toEqual([
        "codex",
        "claude",
        "agy",
      ]);
    });

    it("parses valid comma-separated providers", () => {
      expect(resolveConfiguredProviders("claude, codex")).toEqual([
        "claude",
        "codex",
      ]);
    });

    it("throws on empty or malformed list", () => {
      expect(() => resolveConfiguredProviders(" ,  ")).toThrow(
        /contains no provider names/,
      );
    });

    it("throws on unknown provider names", () => {
      expect(() => resolveConfiguredProviders("codex, unknown-bot")).toThrow(
        /Invalid agent provider "unknown-bot"/,
      );
    });
  });
});
