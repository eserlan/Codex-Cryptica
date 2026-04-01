import assert from "node:assert/strict";
import test from "node:test";
import { labelsForPullRequest } from "./pr-labeler.mjs";

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
