import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnswerConfigInput } from "../apps/web/src/lib/content/answers/schema";

/**
 * Deterministic house-style checks for Answer pages (#4012).
 *
 * Only rules a machine can decide without judgement live here. Prose economy,
 * argument quality and realistic examples stay with editorial review.
 *
 * Rules already owned elsewhere are deliberately not repeated:
 * - British English spellings, SEO title/description length, the R2 image
 *   requirement and live-route links: `answers/registry.test.ts`
 * - Related-answer links and reciprocity: `check-answer-mesh.ts`
 * - Intent ownership and overlap: `discovery-audit.mjs`
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
export const PAGES_DIR = "apps/web/src/lib/content/answers/pages";
export const BASELINE_PATH = path.join(
  __dirname,
  "answer-editorial-baseline.json",
);

/**
 * Answers have no scheduled publishing: a page renders as soon as it ships,
 * whatever its `publishedAt`. A date a few days ahead is a normal "goes out
 * with the next release" choice and only warns; further out is a mistake.
 */
export const FUTURE_DATE_GRACE_DAYS = 7;

export type EditorialRule =
  | "prohibited-dash"
  | "emoji"
  | "blank-text"
  | "image-alt-missing"
  | "invalid-date"
  | "future-date";

export interface EditorialFinding {
  rule: EditorialRule;
  severity: "error" | "warning";
  slug: string;
  /** Dotted path into the AnswerConfig, e.g. `sections[3].items[1].text`. */
  field: string;
  message: string;
  excerpt?: string;
}

/**
 * Keys whose values are machine data rather than reader-facing copy: slugs,
 * enums, dates, URLs and the discovery-registry metadata.
 */
const NON_PROSE_KEYS = new Set([
  "slug",
  "kind",
  "category",
  "publishedAt",
  "relatedAnswers",
  "labels",
  "discovery",
  "href",
  "canonical",
  "image",
  "external",
  "ordered",
]);

/** Fields that must carry visible text when present. */
const NON_BLANK_FIELDS =
  /^(question|shortAnswer|seo\.(title|description|imageAlt)|codexConnection\.(heading|linkText)|sections\[\d+\]\.heading)$/;

const DASH = /[–—]/g;
// Emoji-presentation characters, or a pictograph forced to emoji with U+FE0F.
// Plain symbols such as ©, ™, ★, ✓ and → are used as notation and stay legal.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/gu;

const DASH_NAMES: Record<string, string> = {
  "—": "em dash",
  "–": "en dash",
};

function excerptAround(value: string, index: number, length = 1): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(value.length, index + length + 30);
  return (
    (start > 0 ? "…" : "") +
    value.slice(start, end).replace(/\n/g, "\\n") +
    (end < value.length ? "…" : "")
  );
}

/** Every reader-facing string in an answer, with its field path. */
export function collectProseFields(
  value: unknown,
  fieldPath = "",
): Array<{ field: string; value: string }> {
  if (typeof value === "string") return [{ field: fieldPath, value }];
  return childEntries(value, fieldPath).flatMap(([childPath, child]) =>
    collectProseFields(child, childPath),
  );
}

/** Child values of an array or object with their field paths, skipping metadata. */
function childEntries(
  value: unknown,
  fieldPath: string,
): Array<[string, unknown]> {
  if (Array.isArray(value)) {
    return value.map((item, index) => [`${fieldPath}[${index}]`, item]);
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .filter(([key]) => !NON_PROSE_KEYS.has(key))
    .map(([key, child]) => [fieldPath ? `${fieldPath}.${key}` : key, child]);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function checkPublishedAt(
  answer: Pick<AnswerConfigInput, "slug" | "publishedAt">,
  asOf: string,
): EditorialFinding[] {
  const { slug, publishedAt } = answer;
  if (!isRealDate(publishedAt)) {
    return [
      {
        rule: "invalid-date",
        severity: "error",
        slug,
        field: "publishedAt",
        message: `"${publishedAt}" is not a real calendar date (YYYY-MM-DD).`,
      },
    ];
  }
  const ahead = daysBetween(asOf, publishedAt);
  return ahead > 0 ? [futureDateFinding(slug, publishedAt, asOf, ahead)] : [];
}

function futureDateFinding(
  slug: string,
  publishedAt: string,
  asOf: string,
  ahead: number,
): EditorialFinding {
  const tooFar = ahead > FUTURE_DATE_GRACE_DAYS;
  return {
    rule: "future-date",
    severity: tooFar ? "error" : "warning",
    slug,
    field: "publishedAt",
    message: tooFar
      ? `${publishedAt} is ${ahead} days after ${asOf}. Answers publish when they ship, so the page would show a date more than ${FUTURE_DATE_GRACE_DAYS} days ahead. Use the release date.`
      : `${publishedAt} is ${ahead} day(s) after ${asOf}. Fine if it matches the release this ships in; the page goes live when deployed, not on this date.`,
  };
}

function matchFindings(
  slug: string,
  field: string,
  value: string,
  pattern: RegExp,
  rule: EditorialRule,
  message: (match: string) => string,
): EditorialFinding[] {
  return Array.from(value.matchAll(pattern), (match) => ({
    rule,
    severity: "error",
    slug,
    field,
    message: message(match[0]),
    excerpt: excerptAround(value, match.index, match[0].length),
  }));
}

function checkProseField(
  slug: string,
  field: string,
  value: string,
): EditorialFinding[] {
  const findings = [
    ...matchFindings(
      slug,
      field,
      value,
      DASH,
      "prohibited-dash",
      (dash) =>
        `Remove the ${DASH_NAMES[dash]}; use a comma, colon, semicolon, parentheses or a full stop.`,
    ),
    ...matchFindings(
      slug,
      field,
      value,
      EMOJI,
      "emoji",
      (emoji) => `Remove the emoji "${emoji}".`,
    ),
  ];
  if (NON_BLANK_FIELDS.test(field) && value.trim() === "") {
    findings.push({
      rule: "blank-text",
      severity: "error",
      slug,
      field,
      message: "This field is blank; give it visible text or remove it.",
    });
  }
  return findings;
}

function checkImageAlt({ slug, seo }: AnswerConfigInput): EditorialFinding[] {
  if (!seo.image || seo.imageAlt?.trim()) return [];
  return [
    {
      rule: "image-alt-missing",
      severity: "error",
      slug,
      field: "seo.imageAlt",
      message: "seo.image is set, so seo.imageAlt must describe it.",
    },
  ];
}

export function checkAnswer(
  answer: AnswerConfigInput,
  { asOf }: { asOf: string },
): EditorialFinding[] {
  return [
    ...collectProseFields(answer).flatMap(({ field, value }) =>
      checkProseField(answer.slug, field, value),
    ),
    ...checkImageAlt(answer),
    ...checkPublishedAt(answer, asOf),
  ];
}

/**
 * Best-effort 1-based line of a finding in its source file, found by searching
 * for the text just before the flagged character as it appears in TS source.
 */
export function locateLine(
  source: string,
  finding: EditorialFinding,
): number | undefined {
  const needle = sourceNeedle(finding);
  if (!needle) return undefined;
  const lines = source.split("\n");
  const escaped = JSON.stringify(needle).slice(1, -1);
  const index = [escaped, needle, escaped.slice(0, 25)]
    .map((candidate) => lines.findIndex((line) => line.includes(candidate)))
    .find((found) => found !== -1);
  return index === undefined ? undefined : index + 1;
}

function sourceNeedle(finding: EditorialFinding): string | undefined {
  if (finding.field === "publishedAt") return "publishedAt:";
  return finding.excerpt
    ?.replace(/^…|…$/g, "")
    .replace(/\\n/g, "\n")
    .slice(0, 50);
}

/** Keep content-derived text on one GitHub Actions workflow-command line. */
export function escapeWorkflowCommandData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

/** Baseline: tolerated legacy error counts, keyed `slug` → `rule` → count. */
export type EditorialBaseline = Record<
  string,
  Partial<Record<EditorialRule, number>>
>;

/** Date errors depend on when the check runs, so they are never baselined. */
const isBaselinable = (finding: EditorialFinding): boolean =>
  finding.severity === "error" && finding.rule !== "future-date";

function countErrors(findings: EditorialFinding[]): EditorialBaseline {
  const counts: EditorialBaseline = {};
  for (const finding of findings) {
    const entry = (counts[finding.slug] ??= {});
    entry[finding.rule] = (entry[finding.rule] ?? 0) + 1;
  }
  return counts;
}

export function buildBaseline(findings: EditorialFinding[]): EditorialBaseline {
  return Object.fromEntries(
    Object.entries(countErrors(findings.filter(isBaselinable))).sort(
      ([a], [b]) => a.localeCompare(b),
    ),
  );
}

/**
 * Splits errors into those the baseline tolerates and those it does not.
 * A slug/rule pair over its baselined count fails as a whole, so a new
 * violation in a legacy file cannot hide behind the old ones.
 */
export function applyBaseline(
  findings: EditorialFinding[],
  baseline: EditorialBaseline,
): { blocking: EditorialFinding[]; baselined: EditorialFinding[] } {
  const errors = findings.filter((finding) => finding.severity === "error");
  const actual = countErrors(errors);
  const blocking: EditorialFinding[] = [];
  const baselined: EditorialFinding[] = [];
  for (const finding of errors) {
    const tolerated =
      countFor(actual, finding) <= allowedCount(baseline, finding);
    (tolerated ? baselined : blocking).push(finding);
  }
  return { blocking, baselined };
}

const countFor = (counts: EditorialBaseline, finding: EditorialFinding) =>
  counts[finding.slug]?.[finding.rule] ?? 0;

const allowedCount = (
  baseline: EditorialBaseline,
  finding: EditorialFinding,
) => (isBaselinable(finding) ? countFor(baseline, finding) : 0);

/**
 * Baseline entries for checked answers that now allow more than they have.
 * The baseline only ratchets down: once legacy copy is fixed, the count must
 * be lowered in the same change, or new violations could take the old slots.
 */
export function findStaleBaseline(
  slugs: string[],
  findings: EditorialFinding[],
  baseline: EditorialBaseline,
): string[] {
  const actual = buildBaseline(findings);
  return slugs.flatMap((slug) =>
    Object.entries(baseline[slug] ?? {})
      .filter(
        ([rule, allowed]) =>
          (actual[slug]?.[rule as EditorialRule] ?? 0) < (allowed ?? 0),
      )
      .map(
        ([rule, allowed]) =>
          `${slug}: baseline allows ${allowed} ${rule} but the file now has ${actual[slug]?.[rule as EditorialRule] ?? 0}.`,
      ),
  );
}

/** Maps changed repo paths to the answer slugs they define. */
export function slugsForChangedFiles(
  files: string[],
  knownSlugs: Set<string>,
): string[] {
  const slugs = new Set<string>();
  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (!normalized.startsWith(`${PAGES_DIR}/`)) continue;
    const slug = path.basename(normalized, ".ts");
    if (knownSlugs.has(slug)) slugs.add(slug);
  }
  return Array.from(slugs).sort();
}

function sourceLine(
  file: string,
  root: string,
  finding: EditorialFinding,
): number | undefined {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return undefined;
  return locateLine(fs.readFileSync(absolute, "utf-8"), finding);
}

/** Inline PR annotation line, only when running in GitHub Actions. */
function annotationFor(
  finding: EditorialFinding,
  file: string,
  line: number | undefined,
): string {
  if (!process.env.GITHUB_ACTIONS) return "";
  const position = line ? `,line=${line}` : "";
  return `\n::${finding.severity} file=${file}${position},title=Answer ${finding.rule}::${escapeWorkflowCommandData(`${finding.field}: ${finding.message}`)}`;
}

function formatFinding(
  finding: EditorialFinding,
  root: string,
  annotate = true,
): string {
  const file = `${PAGES_DIR}/${finding.slug}.ts`;
  const line = sourceLine(file, root, finding);
  const location = line ? `${file}:${line}` : file;
  const excerpt = finding.excerpt ? `\n      ${finding.excerpt}` : "";
  const annotation = annotate ? annotationFor(finding, file, line) : "";
  return `  ${location}  [${finding.rule}] ${finding.field}\n      ${finding.message}${excerpt}${annotation}`;
}

function readBaseline(): EditorialBaseline {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));
}

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function argList(args: string[], flag: string): string[] {
  const index = args.indexOf(flag);
  if (index === -1) return [];
  const values: string[] = [];
  for (const value of args.slice(index + 1)) {
    if (value.startsWith("--")) break;
    values.push(value);
  }
  return values;
}

// fallow-ignore-next-line complexity -- CLI mode selection (all, files, baseline update) is covered by the exported helpers' tests.
export async function runCli(args = process.argv.slice(2)): Promise<number> {
  const { answers } = await import("../apps/web/src/lib/content/answers/pages");
  const all = args.includes("--all");
  const updateBaseline = args.includes("--update-baseline");
  const asOf =
    argValue(args, "--as-of") ?? new Date().toISOString().slice(0, 10);
  if (!isRealDate(asOf)) {
    console.error(`--as-of must be a YYYY-MM-DD date, got "${asOf}".`);
    return 2;
  }

  const registry = answers as Record<string, AnswerConfigInput>;
  const slugs =
    all || updateBaseline
      ? Object.keys(registry).sort()
      : slugsForChangedFiles(
          argList(args, "--files"),
          new Set(Object.keys(registry)),
        );

  if (slugs.length === 0) {
    console.log("✨ No changed Answer pages to check.");
    return 0;
  }

  const findings = slugs.flatMap((slug) =>
    checkAnswer(registry[slug], { asOf }),
  );

  if (updateBaseline) {
    const baseline = buildBaseline(findings);
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(
      `Wrote baseline for ${Object.keys(baseline).length} answer(s) to ${path.relative(REPO_ROOT, BASELINE_PATH)}.`,
    );
    return 0;
  }

  const baseline = readBaseline();
  const { blocking, baselined } = applyBaseline(findings, baseline);
  const stale = findStaleBaseline(slugs, findings, baseline);
  const warnings = findings.filter((finding) => finding.severity === "warning");

  console.log(
    `📝 Answer editorial check: ${slugs.length} answer(s), as of ${asOf}.`,
  );
  if (warnings.length > 0) {
    console.warn(`\n⚠ ${warnings.length} warning(s):`);
    for (const finding of warnings)
      console.warn(formatFinding(finding, REPO_ROOT));
  }
  if (all && baselined.length > 0) {
    console.log(`\nℹ ${baselined.length} baselined legacy violation(s):`);
    for (const finding of baselined)
      console.log(formatFinding(finding, REPO_ROOT, false));
  }
  if (blocking.length > 0) {
    console.error(`\n✖ ${blocking.length} Answer editorial violation(s):`);
    for (const finding of blocking)
      console.error(formatFinding(finding, REPO_ROOT));
    console.error(
      "\nRules: .agent/skills/add-answer/SKILL.md (Automated editorial checks).",
    );
    return 1;
  }
  if (stale.length > 0) {
    console.error(`\n✖ ${stale.length} stale baseline entr(ies):`);
    for (const entry of stale) console.error(`  ${entry}`);
    console.error(
      "\nLegacy violations were fixed, so lower the baseline: bun scripts/check-answer-editorial.ts --update-baseline",
    );
    return 1;
  }
  console.log("✅ Answer editorial check passed.");
  return 0;
}

if (process.argv[1] && __filename === path.resolve(process.argv[1])) {
  process.exit(await runCli());
}
