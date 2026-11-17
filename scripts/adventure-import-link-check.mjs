#!/usr/bin/env bun
/**
 * Adventure JSON guide link smoke check (#4893).
 *
 * Verifies the assets the public conversion guide promises: the guide page,
 * the static JSON Schema (and its alias), both example files, the import CTA
 * and the llms.txt discovery entries. Read-only.
 *
 * Usage:
 *   bun scripts/adventure-import-link-check.mjs                       production
 *   bun scripts/adventure-import-link-check.mjs --base=https://staging.codexcryptica.com
 *   bun scripts/adventure-import-link-check.mjs --strict-production   fail if the
 *       guide's absolute production URLs do not resolve (use at release time)
 *
 * Notes on what is NOT a failure:
 * - The app routes (e.g. /adventure) are served from the SPA fallback, so the
 *   HTTP status can be 404 while the shell loads. That says nothing about the
 *   authenticated route, so it is only checked for an HTML shell.
 * - On a non-production base, the guide's canonical prompt still points at
 *   production. If production does not serve those URLs yet, that is reported
 *   as an environment-dependent warning, not an error (unless --strict-production).
 */
import { fileURLToPath } from "node:url";

const PRODUCTION = "https://codexcryptica.com";
const TIMEOUT_MS = 20_000;

export const GUIDE_PATH = "/adventure-import";
export const JSON_ASSETS = [
  "/schemas/adventure-json/v1.json",
  "/schemas/adventure/v1.json",
  "/schemas/adventure-json/examples/minimal.v1.json",
  "/schemas/adventure-json/examples/reference-one-shot.v1.json",
];
export const PROMPT_PATH = "/adventure-import/prompt.txt";
export const CTA_HREF = "./adventure#import-adventure-json";

const isJsonType = (type) =>
  /^application\/(schema\+)?json\b/i.test(type ?? "");
const isTextType = (type) => /^text\/plain\b/i.test(type ?? "");
const isHtmlType = (type) => /^text\/html\b/i.test(type ?? "");

const statusProblem = (path, status) =>
  status === 200 ? [] : [`${path}: HTTP ${status}, expected 200`];

const typeProblem = (path, contentType, test, expected) =>
  test(contentType)
    ? []
    : [`${path}: content-type "${contentType}", expected ${expected}`];

function jsonBodyProblem(path, body) {
  try {
    const parsed = JSON.parse(body);
    return parsed !== null && typeof parsed === "object"
      ? []
      : [`${path}: JSON is not an object`];
  } catch {
    return [`${path}: body is not valid JSON`];
  }
}

/** Pure: judge a JSON asset response. Returns problem strings. */
export function jsonAssetProblems(path, { status, contentType, body }) {
  return [
    ...statusProblem(path, status),
    ...typeProblem(path, contentType, isJsonType, "application/json"),
    ...jsonBodyProblem(path, body),
  ];
}

const GUIDE_LINKS = [
  "./schemas/adventure-json/v1.json",
  "./schemas/adventure-json/examples/minimal.v1.json",
  "./schemas/adventure-json/examples/reference-one-shot.v1.json",
  CTA_HREF,
];

/** Pure: judge the guide page. */
export function guideProblems({ status, contentType, body }) {
  return [
    ...statusProblem(GUIDE_PATH, status),
    ...typeProblem(GUIDE_PATH, contentType, isHtmlType, "text/html"),
    ...GUIDE_LINKS.filter((h) => !body.includes(`href="${h}"`)).map(
      (h) => `${GUIDE_PATH}: missing link ${h}`,
    ),
  ];
}

/** Pure: absolute production URLs the guide/prompt sends users to. */
export function productionLinks(body) {
  const found = body.match(
    /https:\/\/codexcryptica\.com\/(?:adventure-import(?:\/prompt\.txt)?|schemas\/[a-zA-Z0-9/._-]+)/g,
  );
  return [...new Set(found ?? [])];
}

/** Pure: judge the plain-text prompt file. */
export function promptTxtProblems({ status, contentType, body }) {
  return [
    ...statusProblem(PROMPT_PATH, status),
    ...typeProblem(PROMPT_PATH, contentType, isTextType, "text/plain"),
    ...(body.startsWith("Convert the tabletop RPG adventure") &&
    body.includes(`${PRODUCTION}/schemas/adventure-json/v1.json`)
      ? []
      : [`${PROMPT_PATH}: body is not the conversion prompt`]),
  ];
}

/** Pure: the SPA shell check for authenticated app routes. */
export function appShellProblems(path, { contentType, body }) {
  return isHtmlType(contentType) && /<html/i.test(body)
    ? []
    : [`${path}: did not return the app HTML shell`];
}

/** Pure: discovery entries. */
export function discoveryProblems(llms, llmsFull) {
  const out = [];
  if (!llms.includes(`${PRODUCTION}${GUIDE_PATH}`))
    out.push("/llms.txt: no Adventure JSON guide entry");
  if (!llmsFull.includes(GUIDE_PATH))
    out.push("/llms-full.txt: no Adventure JSON guide entry");
  return out;
}

async function get(url) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "CodexCrypticaLinkSmoke/1.0" },
  });
  return {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    body: await res.text(),
  };
}

async function checkProductionDependencies(base, guideBody, strict, log) {
  const errors = [];
  const warnings = [];
  for (const url of productionLinks(guideBody)) {
    const res = await get(url);
    log(`${res.status} ${res.contentType} ${url} (production dependency)`);
    if (res.status === 200) continue;
    const msg = `${url}: HTTP ${res.status} on production; testers on ${base} are sent there by the guide's prompt`;
    (strict ? errors : warnings).push(msg);
  }
  return { errors, warnings };
}

export async function run({ base, strictProduction }) {
  const log = (line) => console.log(line);
  const errors = [];

  const guide = await get(`${base}${GUIDE_PATH}`);
  log(`${guide.status} ${guide.contentType} ${GUIDE_PATH}`);
  errors.push(...guideProblems(guide));

  for (const path of JSON_ASSETS) {
    const res = await get(`${base}${path}`);
    log(`${res.status} ${res.contentType} ${path}`);
    errors.push(...jsonAssetProblems(path, res));
  }

  const prompt = await get(`${base}${PROMPT_PATH}`);
  log(`${prompt.status} ${prompt.contentType} ${PROMPT_PATH}`);
  errors.push(...promptTxtProblems(prompt));

  const app = await get(`${base}/adventure`);
  log(`${app.status} /adventure (SPA shell; status not judged)`);
  errors.push(...appShellProblems("/adventure", app));

  const [llms, llmsFull] = await Promise.all([
    get(`${base}/llms.txt`),
    get(`${base}/llms-full.txt`),
  ]);
  errors.push(...discoveryProblems(llms.body, llmsFull.body));

  const prod = await checkProductionDependencies(
    base,
    guide.body,
    strictProduction,
    log,
  );
  return {
    errors: [...errors, ...prod.errors],
    warnings: prod.warnings,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const base = (arg("base") ?? PRODUCTION).replace(/\/$/, "");
  const { errors, warnings } = await run({
    base,
    strictProduction: process.argv.includes("--strict-production"),
  });
  for (const w of warnings) console.warn(`WARN  ${w}`);
  for (const e of errors) console.error(`FAIL  ${e}`);
  console.log(
    errors.length
      ? `\n${errors.length} problem(s) on ${base}`
      : `\nAll adventure guide links OK on ${base}`,
  );
  process.exit(errors.length ? 1 : 0);
}
