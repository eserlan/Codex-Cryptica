#!/usr/bin/env bun
/**
 * Deletes one in-app report from the private triage repository by its reference.
 *
 * Run it as the maintainer, logged in with `gh`. It uses that login, never a
 * token from the worker, and it deletes the issue rather than closing it, so
 * the report's text is gone (FR-024). Usage:
 *
 *   FEEDBACK_REPO=owner/name bun scripts/feedback-delete.ts CC-7F3K-9Q2M
 */
import { isReference } from "feedback-engine";

export type GhRunner = (args: string[]) => Promise<string>;

export interface FoundIssue {
  id: string;
  number: number;
  title: string;
}

export type DeleteResult =
  | { status: "deleted"; number: number }
  | { status: "not-found" }
  | { status: "ambiguous"; numbers: number[] };

export function parseArgs(argv: string[]): { reference: string } {
  if (argv.length !== 1)
    throw new Error("Usage: feedback-delete.ts <CC-XXXX-XXXX>");
  const [reference] = argv as [string];
  if (!isReference(reference))
    throw new Error("That is not a valid report reference.");
  return { reference };
}

const runGh: GhRunner = async (args) => {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const [out, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`gh ${args[0]} failed`);
  return out;
};

/** Finds issues whose title carries the reference. The reference is validated first. */
export async function findReportIssues(
  repo: string,
  reference: string,
  run: GhRunner,
): Promise<FoundIssue[]> {
  const out = await run([
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "all",
    "--search",
    `${reference} in:title`,
    "--limit",
    "20",
    "--json",
    "id,number,title",
  ]);
  return (JSON.parse(out) as FoundIssue[]).filter((issue) =>
    issue.title.includes(reference),
  );
}

export async function runDelete(input: {
  reference: string;
  repo: string;
  run: GhRunner;
}): Promise<DeleteResult> {
  if (!input.repo) throw new Error("FEEDBACK_REPO is not set.");
  const issues = await findReportIssues(input.repo, input.reference, input.run);
  if (issues.length === 0) return { status: "not-found" };
  if (issues.length > 1)
    return { status: "ambiguous", numbers: issues.map((i) => i.number) };

  const [issue] = issues as [FoundIssue];
  await input.run([
    "api",
    "graphql",
    "-f",
    "query=mutation($id: ID!) { deleteIssue(input: { issueId: $id }) { clientMutationId } }",
    "-f",
    `id=${issue.id}`,
  ]);
  return { status: "deleted", number: issue.number };
}

if (import.meta.main) {
  const { reference } = parseArgs(process.argv.slice(2));
  const result = await runDelete({
    reference,
    repo: process.env.FEEDBACK_REPO ?? "",
    run: runGh,
  });
  if (result.status === "deleted")
    console.log(`Deleted issue #${result.number} for ${reference}.`);
  else if (result.status === "not-found")
    console.error(`No report found for ${reference}. Nothing deleted.`);
  else
    console.error(
      `More than one issue matches ${reference} (#${result.numbers.join(", #")}). Nothing deleted.`,
    );
  process.exitCode = result.status === "deleted" ? 0 : 1;
}
