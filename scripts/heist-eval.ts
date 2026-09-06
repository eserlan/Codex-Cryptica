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
 * Roughly 4.5k tokens per generation at the time of writing.
 *
 * Findings are printed grouped by kind, with a few examples each. A clean run
 * prints "no contract violations" — which is the point: this is a sweep, not
 * an assertion suite, so it is meant to be run and read, not wired into CI.
 */

import {
  buildHeistPrompt,
  generateHeistLocal,
  heistConfig,
  parseHeistResponse,
} from "../packages/generator-engine/src/public-heist";
import { factionConfig } from "../packages/generator-engine/src/public-faction-constants";
import { getGeneratorDocumentLayout } from "../apps/web/src/lib/components/seo/generator-document-layout";

export interface HeistDraft {
  heistType: string;
  genre: string;
  content: string;
  lore: string;
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

const REQUIRED_LORE_SECTIONS = [
  "GM Quick Reference",
  "The Hidden Factor",
  "Security Rings",
  "Alarm Track",
  "Complications",
  "The Getaway",
  "Flashback Opportunities",
];

/** Mechanics belonging to one game system, which System-neutral output bans. */
const SYSTEM_MECHANICS =
  /\b(saving throw|hit points?|\bDC\s?\d|advantage|disadvantage|\bd20\b|per round|one round)\b/i;

/** Wording that assumes the objective is an object being removed. */
const REMOVAL_WORDING = /\bthe prize\b|\bprize's\b|absence of/i;

/**
 * Grade one generated heist against the contract. Pure, so the rules are
 * testable without generating anything.
 */
export function gradeHeist(draft: HeistDraft): Finding[] {
  const findings: Finding[] = [];
  const add = (kind: string, detail: string) => findings.push({ kind, detail });
  const id = `${draft.heistType}/${draft.genre}`;
  const objective = heistConfig.objectives[draft.heistType];

  const contentSections = splitSections(draft.content);
  const loreSections = splitSections(draft.lore);
  const headings = [...contentSections, ...loreSections].map((s) => s.heading);

  const duplicates = [
    ...new Set(headings.filter((h, i) => headings.indexOf(h) !== i)),
  ];
  if (duplicates.length)
    add("duplicate-heading", `${id}: ${duplicates.join(", ")}`);

  for (const section of [...contentSections, ...loreSections]) {
    if (!section.body.trim()) add("empty-section", `${id}: ${section.heading}`);
  }

  if (objective) {
    if (!headings.includes(objective.heading)) {
      add("objective-heading", `${id}: expected "${objective.heading}"`);
    }
    if (!headings.includes(objective.momentHeading)) {
      add("moment-heading", `${id}: expected "${objective.momentHeading}"`);
    }
    // A plant, a kill or a sabotage has no "prize taken" moment at all.
    if (
      draft.heistType !== "Theft" &&
      headings.includes("When the Prize Is Taken")
    ) {
      add("theft-moment-on-other-type", id);
    }
  }

  for (const required of REQUIRED_LORE_SECTIONS) {
    if (!headings.includes(required))
      add("missing-section", `${id}: ${required}`);
  }

  const whole = `${draft.content}\n${draft.lore}`;
  for (let level = 0; level <= 4; level += 1) {
    if (!whole.includes(`${level} —`))
      add("alarm-level", `${id}: level ${level}`);
  }
  // Check the whole rendered document: the layout routes Complications into
  // the main column, so a lore-only check would never find the marker.
  const defaults = (whole.match(/\(default\)/g) ?? []).length;
  if (defaults !== 1) add("default-marker", `${id}: ${defaults}`);

  const flashbacks = [...contentSections, ...loreSections].find(
    (s) => s.heading === "Flashback Opportunities",
  );
  if (flashbacks) {
    const count = (flashbacks.body.match(/^\s*-\s/gm) ?? []).length;
    if (count < 4 || count > 6) add("flashback-count", `${id}: ${count}`);
  }

  if (SYSTEM_MECHANICS.test(whole)) {
    add("system-mechanics", `${id}: ${whole.match(SYSTEM_MECHANICS)?.[0]}`);
  }
  if (draft.heistType !== "Theft" && REMOVAL_WORDING.test(whole)) {
    add("removal-wording", `${id}: ${whole.match(REMOVAL_WORDING)?.[0]}`);
  }

  // The catch has to suit what the objective actually is. The AI writes this
  // line as prose rather than the fallback's "Label — detail" shape, so only
  // flag a line that opens with a label belonging to a *different* pool —
  // anything else is a formatting difference, not a coherence failure.
  const kind = heistConfig.catchKindByType[draft.heistType] ?? "object";
  const catchLine = (draft.content.split("**The catch**: ")[1] ?? "")
    .split("\n")[0]
    .trim();
  if (catchLine) {
    const labelled = Object.entries(heistConfig.catchesByKind).flatMap(
      ([poolKind, pool]) =>
        pool
          .map((entry) => entry.split(" — ")[0])
          .filter((label) => new RegExp(`^${label}\\b`, "i").test(catchLine))
          .map((label) => ({ poolKind, label })),
    );
    if (labelled.length && !labelled.some((m) => m.poolKind === kind)) {
      add("catch-kind", `${id}: "${labelled[0].label}" is not a ${kind} catch`);
    }
  }

  // The same sentence appearing under two headings is redundancy, not emphasis.
  const seen = new Map<string, string>();
  for (const section of [...contentSections, ...loreSections]) {
    for (const sentence of section.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 45)) {
      const key = sentence.toLowerCase().replace(/[^a-z ]/g, "");
      const previous = seen.get(key);
      if (previous && previous !== section.heading) {
        add("verbatim-repeat", `${id}: ${previous} + ${section.heading}`);
      } else {
        seen.set(key, section.heading);
      }
    }
  }

  return findings;
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

async function generateViaProxy(
  proxy: string,
  heistType: string,
  genre: string,
): Promise<HeistDraft> {
  const { systemInstruction, userMessage, resolved } = buildHeistPrompt({
    heistType,
    genre,
    targetScale: "Major",
  });
  const response = await fetch(proxy, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({
      operation: "freeform-generation",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
    }),
  });
  const payload = (await response.json()) as {
    content?: string;
    error?: unknown;
  };
  if (!response.ok) throw new Error(JSON.stringify(payload).slice(0, 200));
  const output = parseHeistResponse(payload.content ?? "", resolved);
  const repaired = rawDuplicateHeadings(
    output.content ?? "",
    output.lore ?? "",
  );
  if (repaired.length) {
    process.stderr.write(
      `      (layout repaired duplicates: ${repaired.join(", ")})\n`,
    );
  }
  return renderDraft(heistType, genre, output.content ?? "", output.lore ?? "");
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string, fallback: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const mode = flag("mode", "local");
  const runs = Number(flag("runs", mode === "ai" ? "10" : "240"));
  const proxy = flag("proxy", "http://localhost:8787");

  const drafts: HeistDraft[] = [];
  const errors: string[] = [];
  const plan = buildPlan(runs);

  for (const [index, { heistType, genre }] of plan.entries()) {
    if (mode === "ai") {
      try {
        drafts.push(await generateViaProxy(proxy, heistType, genre));
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
        ? "no contract violations in the generations that succeeded"
        : "no contract violations",
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
