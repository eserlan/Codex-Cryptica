/**
 * Heist generator evaluation harness (#2768).
 *
 * Generates heists across randomised inputs and grades each one against the
 * generator's own contract — the structural invariants that unit tests cannot
 * check, because they are properties of a *generated document* rather than of
 * a function's return value.
 *
 * Two modes:
 *
 *   bun scripts/heist-eval.ts                    # local fallback, no setup
 *   bun scripts/heist-eval.ts --mode ai --runs 10
 *   bun scripts/heist-eval.ts --mode fixtures --json
 *
 * ## Running the AI mode
 *
 * AI mode needs an LLM. The deployed proxy requires a Turnstile-minted session
 * token, which a script cannot get and must not work around — but the worker's
 * session guard *fails open* when `SESSION_TOKEN_SECRET` is unset, which is
 * the case for `wrangler dev`. So:
 *
 *   1. put a provider key in `apps/workers/oracle-proxy/.dev.vars`
 *      (`OPENAI_API_KEY` is enough — both generation operations default to
 *      Luna, with Gemini only as fallback)
 *   2. `bun run dev:proxy`
 *   3. `bun scripts/heist-eval.ts --mode ai`
 *
 * Note that AI mode spends real tokens against whichever key that file holds.
 * AI mode runs generation, an independent audit and conditional repair.
 * Fixtures mode starts from each synthetic case, audits it, conditionally
 * repairs it, and exposes the original, audit, selected output and human
 * rubric. Both modes spend provider tokens.
 *
 * Findings are printed grouped by kind, with a few examples each. A clean run
 * prints "no structural/advisory findings (semantic quality not measured)" — which is the point: this is a sweep, not
 * an assertion suite, so it is meant to be run and read, not wired into CI.
 */

import {
  buildHeistPrompt,
  generateHeistLocal,
  heistConfig,
} from "../packages/generator-engine/src/public-heist";
import { runHeistGeneration } from "../packages/generator-engine/src/heist-generation";
import {
  heistStateCases,
  type HeistStateCase,
} from "./fixtures/heist-state-cases";
import { validateHeist } from "../packages/generator-engine/src/heist-validation";
import { factionConfig } from "../packages/generator-engine/src/public-faction-constants";
import { getGeneratorDocumentLayout } from "../apps/web/src/lib/components/seo/generator-document-layout";

export interface HeistDraft {
  heistType: string;
  genre: string;
  content: string;
  lore: string;
  review?: {
    status: string;
    audit?: unknown;
    error?: string;
    original: { content: string; lore: string };
    candidate?: { content: string; lore: string };
    beforeFindings: string[];
    afterFindings: string[];
    criteria?: string[];
    caseId?: string;
  };
}

export interface Finding {
  kind: string;
  detail: string;
}

/**
 * Grade what a reader actually sees, not the raw model response.
 *
 * `getGeneratorDocumentLayout` is what the page renders: it routes lore
 * sections between the main column and the rail, and enforces the
 * "a heading renders once, never empty" invariant. Grading the raw parse
 * would report duplicates the reader never encounters — and would miss the
 * fact that the invariant is the only reason they never do.
 */
export function renderDraft(
  heistType: string,
  genre: string,
  content: string,
  lore: string,
): HeistDraft {
  const layout = getGeneratorDocumentLayout({
    type: "event",
    title: "",
    summary: "",
    status: "active",
    labels: ["heist", "heist-generator"],
    content,
    lore,
  } as Parameters<typeof getGeneratorDocumentLayout>[0]);
  return { heistType, genre, content: layout.content, lore: layout.lore };
}

/** Headings the model emitted more than once, before the layout repaired it. */
export function rawDuplicateHeadings(content: string, lore: string): string[] {
  const headings = [...splitSections(content), ...splitSections(lore)].map(
    (s) => s.heading,
  );
  return [...new Set(headings.filter((h, i) => headings.indexOf(h) !== i))];
}

interface MarkdownSection {
  heading: string;
  body: string;
}

/** Split a generated markdown field into its `##`/`###` sections. */
export function splitSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  for (const line of (markdown || "").split("\n")) {
    const match = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1].trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Grade one generated heist. The rules live in the generator-engine package so
 * the runtime repair pass and this sweep can never disagree about what
 * "correct" means; this wrapper only adapts the finding shape.
 */
export function gradeHeist(draft: HeistDraft): Finding[] {
  return validateHeist({
    heistType: draft.heistType,
    genre: draft.genre,
    content: draft.content,
    lore: draft.lore,
  }).map((f) => ({
    kind: f.kind,
    detail: `${draft.heistType}/${draft.genre}: ${f.message}`,
  }));
}

export function wordCount(draft: HeistDraft): number {
  return `${draft.content}\n${draft.lore}`.trim().split(/\s+/).filter(Boolean)
    .length;
}

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildPlan(runs: number): Array<{ heistType: string; genre: string }> {
  const types = Object.keys(heistConfig.objectives);
  const rng = seededRng(20260906);
  return Array.from({ length: runs }, (_, i) => ({
    heistType: types[i % types.length],
    genre:
      factionConfig.themes[Math.floor(rng() * factionConfig.themes.length)],
  }));
}

export async function generateViaProxy(
  proxy: string,
  heistType: string,
  genre: string,
  fetcher: typeof fetch = fetch,
  fixture?: HeistStateCase,
): Promise<HeistDraft> {
  const prompt =
    fixture?.prompt ??
    buildHeistPrompt({ heistType, genre, targetScale: "Major" });
  const conversation = (useFixture = false) => {
    const messages = [{ role: "system", content: prompt.systemInstruction }];
    return async (message: string) => {
      messages.push({ role: "user", content: message });
      let content: string;
      if (useFixture && fixture && messages.length === 2) {
        content = JSON.stringify(fixture.draft);
      } else {
        const response = await fetcher(proxy, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify({ operation: "freeform-generation", messages }),
        });
        const payload = (await response.json()) as {
          content?: string;
          error?: unknown;
        };
        if (!response.ok)
          throw new Error(JSON.stringify(payload).slice(0, 200));
        content = payload.content ?? "";
      }
      messages.push({ role: "assistant", content });
      return content;
    };
  };
  const result = await runHeistGeneration(prompt, {
    generate: conversation(true),
    review: conversation(),
  });
  return {
    ...renderDraft(heistType, genre, result.output.content, result.output.lore),
    review: {
      status: result.reviewStatus,
      audit: result.audit,
      error: result.reviewError,
      original: { content: result.initial.content, lore: result.initial.lore },
      candidate: result.reviewed
        ? { content: result.reviewed.content, lore: result.reviewed.lore }
        : undefined,
      beforeFindings: result.before.map((finding) => finding.message),
      afterFindings: result.after.map((finding) => finding.message),
      criteria: fixture?.criteria,
      caseId: fixture?.id,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string, fallback: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const mode = flag("mode", "local");
  const runs = Number(flag("runs", mode === "local" ? "240" : "10"));
  const proxy = flag("proxy", "http://localhost:8787");

  const drafts: HeistDraft[] = [];
  const errors: string[] = [];
  const fixtures = mode === "fixtures" ? heistStateCases() : [];
  const plan = fixtures.length
    ? fixtures.map((fixture) => ({
        heistType: fixture.prompt.resolved.heistType,
        genre: fixture.prompt.resolved.genre,
      }))
    : buildPlan(runs);

  for (const [index, { heistType, genre }] of plan.entries()) {
    if (mode === "ai" || mode === "fixtures") {
      try {
        drafts.push(
          await generateViaProxy(
            proxy,
            heistType,
            genre,
            fetch,
            fixtures[index],
          ),
        );
        process.stderr.write(`  ok  ${heistType}/${genre}\n`);
      } catch (error) {
        errors.push(`${heistType}/${genre}: ${String(error).slice(0, 160)}`);
        process.stderr.write(`  ERR ${heistType}/${genre}\n`);
      }
    } else {
      const output = generateHeistLocal(
        { heistType, genre },
        seededRng(index * 7919 + 13),
      );
      drafts.push(
        renderDraft(heistType, genre, output.content ?? "", output.lore ?? ""),
      );
    }
  }

  const grouped = new Map<string, string[]>();
  for (const draft of drafts) {
    for (const finding of gradeHeist(draft)) {
      const bucket = grouped.get(finding.kind) ?? [];
      bucket.push(finding.detail);
      grouped.set(finding.kind, bucket);
    }
  }

  const reviews = drafts.filter((draft) => draft.review);
  const unsuccessfulReview = (draft: HeistDraft) =>
    draft.review?.status !== "accepted" && draft.review?.status !== "clean";
  if (args.includes("--json")) {
    console.log(
      JSON.stringify(
        {
          mode,
          drafts,
          errors,
          structuralFindings: Object.fromEntries(grouped),
        },
        null,
        2,
      ),
    );
    if (errors.length || grouped.size || reviews.some(unsuccessfulReview))
      process.exitCode = 1;
    return;
  }
  if (reviews.length) {
    const counts = reviews.reduce<Record<string, number>>((acc, draft) => {
      const status = draft.review!.status;
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
    console.log("review outcomes:", JSON.stringify(counts));
    if (reviews.some(unsuccessfulReview)) process.exitCode = 1;
    console.log(
      "Semantic quality is not scored automatically. Use --json to inspect original/reviewed documents and fixture criteria.",
    );
  }
  const lengths = drafts.map(wordCount).sort((a, b) => a - b);
  console.log(`\n${mode} mode — graded ${drafts.length} generations`);
  if (lengths.length) {
    console.log(
      `words: min ${lengths[0]} median ${lengths[Math.floor(lengths.length / 2)]} max ${lengths.at(-1)}\n`,
    );
  }
  if (errors.length) {
    console.log(`generation errors: ${errors.length}`);
    for (const error of errors.slice(0, 5)) console.log(`    ${error}`);
    process.exitCode = 1;
  }
  if (!drafts.length) {
    // Nothing was graded, which is not the same as nothing being wrong.
    console.log("no generations to grade");
    return;
  }
  if (!grouped.size) {
    console.log(
      errors.length
        ? "no structural/advisory findings in the generations that succeeded"
        : "no structural/advisory findings (semantic quality not measured)",
    );
    return;
  }
  for (const kind of [...grouped.keys()].sort()) {
    const details = grouped.get(kind)!;
    console.log(`${kind}: ${details.length}`);
    for (const detail of [...new Set(details)].slice(0, 5)) {
      console.log(`    ${detail.replace(/\s+/g, " ").slice(0, 140)}`);
    }
  }
  process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
