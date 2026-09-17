import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const scriptPath = resolve(import.meta.dir, "notify-search-indexes.ts");

describe("notify-search-indexes CLI (#3164)", () => {
  test("prints help message with --help", () => {
    const output = execFileSync("bun", [scriptPath, "--help"], {
      encoding: "utf8",
    });
    expect(output).toContain("Codex Cryptica - IndexNow Search Index Notifier");
    expect(output).toContain("--cluster=<name>");
    expect(output).toContain("--dry-run");
  });

  test("resolves heist cluster in dry-run mode and outputs JSON", () => {
    const output = execFileSync(
      "bun",
      [scriptPath, "--cluster=heist", "--dry-run", "--json"],
      {
        encoding: "utf8",
      },
    );

    const parsed = JSON.parse(output);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.overallSuccess).toBe(true);
    expect(parsed.host).toBe("codexcryptica.com");
    expect(parsed.submittedUrls).toContain(
      "https://codexcryptica.com/generators/heist",
    );
    expect(parsed.submittedUrls).toContain(
      "https://codexcryptica.com/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    );
    expect(parsed.submittedUrls).toContain("https://codexcryptica.com/tools");
    expect(parsed.submittedUrls).toContain(
      "https://codexcryptica.com/sitemap.xml",
    );
    expect(parsed.submittedUrls.length).toBe(12);
  });

  test("filters out invalid and private paths via CLI --urls", () => {
    const output = execFileSync(
      "bun",
      [
        scriptPath,
        "--urls=/vault/secret,/tools/dnd-npc-generator,/generators/heist",
        "--dry-run",
        "--json",
      ],
      {
        encoding: "utf8",
      },
    );

    const parsed = JSON.parse(output);
    expect(parsed.submittedUrls).toEqual([
      "https://codexcryptica.com/generators/heist",
    ]);
    expect(parsed.skippedUrls.length).toBe(2);
    expect(parsed.skippedUrls.map((s: { url: string }) => s.url)).toContain(
      "/vault/secret",
    );
    expect(parsed.skippedUrls.map((s: { url: string }) => s.url)).toContain(
      "/tools/dnd-npc-generator",
    );
  });
});

describe("notify-search-indexes workflow (#3164)", () => {
  test("defines cluster, urls, and dry_run inputs with heist default", async () => {
    const { readFile } = await import("node:fs/promises");
    const workflow = await readFile(
      new URL(
        "../.github/workflows/notify-search-indexes.yml",
        import.meta.url,
      ),
      "utf8",
    );

    expect(workflow).toContain("name: Notify Search Indexes (IndexNow)");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("cluster:");
    expect(workflow).toContain('default: "heist"');
    expect(workflow).toContain("dry_run:");
    expect(workflow).toContain("bun scripts/notify-search-indexes.ts");
    expect(workflow).toContain("--summary");
  });
});
