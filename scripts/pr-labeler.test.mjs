import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { labelsForPullRequest, main } from "./pr-labeler.mjs";

test("classifies feat prs as enhancement", () => {
  assert.deepEqual(labelsForPullRequest({ title: "✨ feat(graph): open zen mode", files: [] }), [
    "enhancement",
  ]);
});

test("classifies fix prs as bug", () => {
  assert.deepEqual(labelsForPullRequest({ title: "🩹 fix(p2p): share theme and images", files: [] }), [
    "bug",
  ]);
});

test("classifies docs prs as documentation", () => {
  assert.deepEqual(labelsForPullRequest({ title: "📚 docs: update help article", files: [] }), [
    "documentation",
  ]);
});

test("classifies polish and accessibility prs as improvement", () => {
  assert.deepEqual(
    labelsForPullRequest({ title: "🎨 Palette: Add ARIA labels to main buttons", files: [] }),
    ["improvement"],
  );
});

test("prefers dependencies for dependency file changes", () => {
  assert.deepEqual(
    labelsForPullRequest({
      title: "chore: update lockfile",
      files: ["package-lock.json", "apps/web/src/lib/stores/theme.svelte.ts"],
    }),
    ["dependencies"],
  );
});

test("classifies build deps titles as dependencies", () => {
  assert.deepEqual(
    labelsForPullRequest({
      title: "build(deps): bump the dependencies group",
      files: [],
    }),
    ["dependencies"],
  );
});

test("prefers github actions for workflow changes", () => {
  assert.deepEqual(
    labelsForPullRequest({
      title: "chore: update release workflow",
      files: [".github/workflows/release.yml"],
    }),
    ["github_actions"],
  );
});

test("skips label writes when GitHub denies integration write access", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "pr-labeler-"));
  const eventPath = path.join(tempDir, "event.json");

  await writeFile(
    eventPath,
    JSON.stringify({
      pull_request: {
        number: 42,
        title: "chore: update workflow",
      },
    }),
  );

  const originalEnv = {
    GITHUB_EVENT_PATH: process.env.GITHUB_EVENT_PATH,
    GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  };
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings = [];

  try {
    process.env.GITHUB_EVENT_PATH = eventPath;
    process.env.GITHUB_REPOSITORY = "owner/repo";
    process.env.GITHUB_TOKEN = "token";

    console.warn = (...args) => {
      warnings.push(args.join(" "));
    };

    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const method = (init.method ?? "GET").toUpperCase();

      if (method === "GET" && url.pathname === "/repos/owner/repo/pulls/42/files") {
        return new Response(JSON.stringify([{ filename: ".github/workflows/release.yml" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "GET" && url.pathname === "/repos/owner/repo/issues/42/labels") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (method === "POST" && url.pathname === "/repos/owner/repo/issues/42/labels") {
        return new Response(
          JSON.stringify({
            message: "Resource not accessible by integration",
            status: 403,
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected request: ${method} ${url.pathname}${url.search}`);
    };

    await main();

    assert.match(warnings.join("\n"), /skipping label add/i);
    assert.match(warnings.join("\n"), /label sync skipped/i);
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;

    process.env.GITHUB_EVENT_PATH = originalEnv.GITHUB_EVENT_PATH;
    process.env.GITHUB_REPOSITORY = originalEnv.GITHUB_REPOSITORY;
    process.env.GITHUB_TOKEN = originalEnv.GITHUB_TOKEN;

    await rm(tempDir, { recursive: true, force: true });
  }
});
