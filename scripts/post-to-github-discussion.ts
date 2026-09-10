#!/usr/bin/env bun
/**
 * Posts a discussion to this repository's GitHub Discussions (defaults to
 * the "Announcements" category) via the `createDiscussion` GraphQL mutation,
 * through the `gh` CLI's own auth — no separate token/app setup needed.
 *
 * Usage:
 *   bun scripts/post-to-github-discussion.ts --title "New Feature" --file path/to/draft.md
 *   bun scripts/post-to-github-discussion.ts --title "New Feature" --body "Post body markdown"
 *   echo "Post body" | bun scripts/post-to-github-discussion.ts --title "New Feature"
 *   bun scripts/post-to-github-discussion.ts --dry-run --title "Preview" --body "..."
 *   bun scripts/post-to-github-discussion.ts --category "Show and tell" --title "..." --body "..."
 */

import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

interface CliArgs {
  title?: string;
  body?: string;
  file?: string;
  category: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const result: CliArgs = { category: "Announcements", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--title":
        result.title = argv[++i];
        break;
      case "--body":
        result.body = argv[++i];
        break;
      case "--file":
        result.file = argv[++i];
        break;
      case "--category":
        result.category = argv[++i];
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return result;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function ghGraphql(query: string, variables: Record<string, string>): any {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-f", `${key}=${value}`);
  }
  const output = execFileSync("gh", args, { encoding: "utf-8" });
  return JSON.parse(output);
}

export function findCategoryId(
  categories: Array<{ id: string; name: string }>,
  name: string,
): string {
  const match = categories.find(
    (category) => category.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    const available = categories.map((category) => category.name).join(", ");
    throw new Error(
      `No discussion category named "${name}" (available: ${available})`,
    );
  }
  return match.id;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.title) throw new Error("--title is required");

  let body = args.body ?? "";
  if (args.file) body = await readFile(args.file, "utf8");
  if (!body && !process.stdin.isTTY) body = await readStdin();
  if (!body.trim()) throw new Error("Post body is empty (--body/--file/stdin)");

  if (args.dryRun) {
    console.log(`[dry-run] category: ${args.category}`);
    console.log(`[dry-run] title: ${args.title}`);
    console.log(`[dry-run] body:\n${body}`);
    return;
  }

  const repoQuery = `query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      discussionCategories(first: 20) { nodes { id name } }
    }
  }`;
  const repoResult = ghGraphql(repoQuery, {
    owner: "eserlan",
    name: "Codex-Cryptica",
  });
  const repository = repoResult.data.repository;
  const categoryId = findCategoryId(
    repository.discussionCategories.nodes,
    args.category,
  );

  const createMutation = `mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
    createDiscussion(input: { repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body }) {
      discussion { url }
    }
  }`;
  const createResult = ghGraphql(createMutation, {
    repositoryId: repository.id,
    categoryId,
    title: args.title,
    body,
  });

  console.log(createResult.data.createDiscussion.discussion.url);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
