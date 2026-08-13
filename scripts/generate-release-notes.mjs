/**
 * Builds user-focused GitHub release notes from the in-app changelog
 * (apps/web/src/lib/content/changelog/releases.json).
 *
 * "New" entries are determined by diffing releases.json against its own
 * content at the previous release tag — not by comparing version numbers —
 * so the notes stay correct even when changelog versions and package
 * versions drift.
 *
 * Usage:
 *   PREV_TAG=v0.28.0 RELEASE_VERSION=0.30.0 node scripts/generate-release-notes.mjs > notes.md
 *
 * PREV_TAG is optional; when unset (or the tag lacks the file), the newest
 * entry alone is treated as new.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CHANGELOG_PATH = "apps/web/src/lib/content/changelog/releases.json";
const FULL_DETAIL_COUNT = 2; // newest N entries get full bullets; the rest a recap line

const prevTag = process.env.PREV_TAG ?? "";
const releaseVersion =
  process.env.RELEASE_VERSION ??
  JSON.parse(readFileSync("apps/web/package.json", "utf8")).version;

const current = JSON.parse(readFileSync(CHANGELOG_PATH, "utf8"));

let previousVersions = new Set();
if (prevTag) {
  try {
    const previous = JSON.parse(
      execFileSync("git", ["show", `${prevTag}:${CHANGELOG_PATH}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
    previousVersions = new Set(previous.map((r) => r.version));
  } catch {
    console.error(
      `warning: could not read ${CHANGELOG_PATH} at ${prevTag}; falling back to newest entry only`,
    );
  }
}

const newEntries =
  previousVersions.size > 0
    ? current.filter((r) => !previousVersions.has(r.version))
    : current.slice(0, 1);

// Optional: write the newest new entry's title (the release subtitle) to a
// file, so the workflow can name the release. Empty for maintenance releases.
if (process.env.TITLE_FILE) {
  writeFileSync(process.env.TITLE_FILE, newEntries[0]?.title ?? "");
}

const lines = [];
lines.push("## 📦 Portable Codex", "");
lines.push(
  "Download the `.zip` below for maximum data sovereignty. Extract and serve locally to run Codex Cryptica entirely offline.",
  "",
  "---",
  "",
);

if (newEntries.length === 0) {
  lines.push(
    "Maintenance release — no new in-app changelog entries since the previous release.",
    "",
  );
} else {
  if (newEntries.length > FULL_DETAIL_COUNT) {
    lines.push(
      `This release bundles ${newEntries.length} updates from the in-app changelog. The newest in full, then a recap of the rest.`,
      "",
    );
  }

  for (const entry of newEntries.slice(0, FULL_DETAIL_COUNT)) {
    lines.push(`## ${entry.title} (${entry.version})`, "");
    for (const highlight of entry.highlights) {
      const [name, ...rest] = highlight.split(": ");
      lines.push(
        rest.length > 0
          ? `- **${name}** — ${rest.join(": ")}`
          : `- ${highlight}`,
      );
    }
    lines.push("");
  }

  const recap = newEntries.slice(FULL_DETAIL_COUNT);
  if (recap.length > 0) {
    lines.push("## Also in this release", "");
    for (const entry of recap) {
      let names = entry.highlights.map((h) => h.split(":")[0]);
      if (names.length > 4) names = [...names.slice(0, 4), "and more"];
      lines.push(
        `- **${entry.title}** (${entry.version}, ${entry.date}) — ${names.join(", ")}.`,
      );
    }
    lines.push("");
  }
}

if (prevTag) {
  const repo = process.env.GITHUB_REPOSITORY ?? "eserlan/Codex-Cryptica";
  lines.push(
    `**Full Changelog**: https://github.com/${repo}/compare/${prevTag}...v${releaseVersion}`,
    "",
  );
}

process.stdout.write(lines.join("\n"));
