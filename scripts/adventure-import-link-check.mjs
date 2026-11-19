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
 * - Crawler or curl failures alone do not prove a user-facing route is broken.
 *
 * HTTP status, content type and body are reported as separate results, and a
 * fetch that throws is recorded for that URL without stopping the other checks.
 */
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

const PRODUCTION = "https://codexcryptica.com";
/** The last line of the canonical prompt; a test pins it to conversion-guide.ts. */
export const PROMPT_END_MARKER = "END OF ADVENTURE JSON V1 CONVERSION PROMPT";
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

/** Pure: judge the plain-text prompt file's status and body. */
export function promptTxtProblems({ status, body }) {
  return [
    ...statusProblem(PROMPT_PATH, status),
    ...(body.startsWith("Convert the tabletop RPG adventure") &&
    body.includes(`${PRODUCTION}/schemas/adventure-json/v1.json`)
      ? []
      : [`${PROMPT_PATH}: body is not the conversion prompt`]),
  ];
}

/** Pure: judge the plain-text prompt file's content type. */
export function promptContentTypeProblems({ contentType }) {
  return typeProblem(PROMPT_PATH, contentType, isTextType, "text/plain");
}

/** Pure: the last non-empty line of the prompt must be the end marker. */
export function promptEndMarkerProblems(body) {
  const last = body
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .at(-1);
  return last === PROMPT_END_MARKER
    ? []
    : [
        `${PROMPT_PATH}: last line is ${JSON.stringify(last ?? "")}, expected end marker "${PROMPT_END_MARKER}"`,
      ];
}

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot);/gi, (m, code) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x"))
      return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#"))
      return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return NAMED_ENTITIES[lower] ?? m;
  });
}

/** Pure: the prompt shown on the guide page must equal prompt.txt. */
export function promptPageMatchProblems(promptBody, guideHtml) {
  const match = guideHtml.match(
    /<pre\b[^>]*\bid="canonical-prompt"[^>]*>([\s\S]*?)<\/pre>/,
  );
  if (!match) return [`${GUIDE_PATH}: no <pre id="canonical-prompt"> found`];
  const onPage = decodeEntities(match[1]);
  const expected = promptBody.replace(/\r?\n$/, "");
  return onPage === expected
    ? []
    : [`${GUIDE_PATH}: prompt on the page differs from ${PROMPT_PATH}`];
}

/** Pure: a warning when a request ended at a different URL. */
export function redirectNotes(path, requestedUrl, finalUrl) {
  return finalUrl === requestedUrl
    ? []
    : [`${path}: redirected from ${requestedUrl} to ${finalUrl}`];
}

function sameJson(a, b) {
  try {
    return isDeepStrictEqual(JSON.parse(a), JSON.parse(b));
  } catch {
    return false;
  }
}

function sameAssetBody(path, baseRes, prodRes) {
  return path === PROMPT_PATH
    ? baseRes.body === prodRes.body
    : sameJson(baseRes.body, prodRes.body);
}

function productionContentTypeProblems(path, response) {
  return path === PROMPT_PATH
    ? promptContentTypeProblems(response)
    : typeProblem(path, response.contentType, isJsonType, "application/json");
}

/**
 * Pure: compare a base asset with production's. Returns `{ note }` when they
 * match and `{ problem }` when they differ or production cannot be read.
 * JSON is compared as parsed values, prompt.txt as exact text.
 */
export function canonicalEquivalence(path, baseRes, prodRes) {
  if (prodRes.status !== 200)
    return {
      problem: `${path}: production returned HTTP ${prodRes.status}, cannot verify canonical equivalent`,
    };
  const contentTypeProblems = productionContentTypeProblems(path, prodRes);
  if (contentTypeProblems.length)
    return { problem: `production ${contentTypeProblems.join("; ")}` };
  return sameAssetBody(path, baseRes, prodRes)
    ? { note: `verified canonical equivalent: ${path}` }
    : { problem: `${path}: differs from production` };
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
    url: res.url || url,
  };
}

/** Fetch one URL; a thrown error is recorded in `sink` and returns null. */
async function tryGet(url, sink) {
  try {
    return await get(url);
  } catch (err) {
    sink.push(`${url}: fetch failed (${err?.message ?? err})`);
    return null;
  }
}

/** Fetch a base path, log its final URL and warn about redirects. */
async function fetchChecked(ctx, path) {
  const url = `${ctx.base}${path}`;
  const res = await tryGet(url, ctx.errors);
  if (!res) return null;
  ctx.log(`${res.status} ${res.contentType} ${res.url}`);
  ctx.warnings.push(...redirectNotes(path, url, res.url));
  return res;
}

export async function checkProductionDependencies(ctx, guideBody) {
  for (const url of productionLinks(guideBody)) {
    const res = await tryGet(url, ctx.prodSink);
    if (!res) continue;
    ctx.log(
      `${res.status} ${res.contentType} ${res.url} (production dependency)`,
    );
    ctx.warnings.push(...redirectNotes(url, url, res.url));
    if (res.status !== 200)
      ctx.prodSink.push(
        `${url}: HTTP ${res.status} on production; testers on ${ctx.base} are sent there by the guide's prompt`,
      );
  }
}

async function checkPrompt(ctx, prompt, guide) {
  const found = [
    ...promptTxtProblems(prompt),
    ...promptContentTypeProblems(prompt),
  ];
  const marker = promptEndMarkerProblems(prompt.body);
  if (!marker.length)
    ctx.notes.push(`${PROMPT_PATH}: ends with the end marker`);
  ctx.errors.push(...found, ...marker);
  if (!guide) return;
  const match = promptPageMatchProblems(prompt.body, guide.body);
  if (!match.length)
    ctx.notes.push(`${GUIDE_PATH}: prompt on the page matches ${PROMPT_PATH}`);
  ctx.errors.push(...match);
}

async function checkEquivalentToProduction(ctx, path, baseRes) {
  const requestedUrl = `${PRODUCTION}${path}`;
  const prodRes = await tryGet(requestedUrl, ctx.prodSink);
  if (!prodRes) return;
  ctx.log(
    `${prodRes.status} ${prodRes.contentType} ${prodRes.url} (production equivalent)`,
  );
  ctx.warnings.push(...redirectNotes(path, requestedUrl, prodRes.url));
  const { note, problem } = canonicalEquivalence(path, baseRes, prodRes);
  ctx.notes.push(...(note ? [note] : []));
  ctx.prodSink.push(...(problem ? [problem] : []));
}

async function checkEquivalence(ctx, assets) {
  if (ctx.base === PRODUCTION) return;
  for (const [path, baseRes] of assets)
    await checkEquivalentToProduction(ctx, path, baseRes);
}

async function checkAssets(ctx) {
  const assets = new Map();
  for (const path of JSON_ASSETS) {
    const res = await fetchChecked(ctx, path);
    if (!res) continue;
    assets.set(path, res);
    ctx.errors.push(...jsonAssetProblems(path, res));
  }
  return assets;
}

async function checkAppAndDiscovery(ctx) {
  const app = await tryGet(`${ctx.base}/adventure`, ctx.errors);
  if (app) {
    ctx.log(`${app.status} /adventure (SPA shell; status not judged)`);
    ctx.errors.push(...appShellProblems("/adventure", app));
  }
  const llms = await tryGet(`${ctx.base}/llms.txt`, ctx.errors);
  const llmsFull = await tryGet(`${ctx.base}/llms-full.txt`, ctx.errors);
  if (llms && llmsFull)
    ctx.errors.push(...discoveryProblems(llms.body, llmsFull.body));
}

async function checkGuide(ctx) {
  const guide = await fetchChecked(ctx, GUIDE_PATH);
  if (guide) ctx.errors.push(...guideProblems(guide));
  return guide;
}

async function checkPromptFile(ctx, assets, guide) {
  const prompt = await fetchChecked(ctx, PROMPT_PATH);
  if (!prompt) return;
  assets.set(PROMPT_PATH, prompt);
  await checkPrompt(ctx, prompt, guide);
}

export async function run({ base, strictProduction }) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const prodSink = strictProduction ? errors : warnings;
  const ctx = { base, errors, warnings, notes, prodSink, log: console.log };

  const guide = await checkGuide(ctx);
  const assets = await checkAssets(ctx);
  await checkPromptFile(ctx, assets, guide);
  await checkAppAndDiscovery(ctx);
  await checkEquivalence(ctx, assets);
  await checkProductionDependencies(ctx, guide?.body ?? "");
  return { errors, warnings, notes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const base = (arg("base") ?? PRODUCTION).replace(/\/$/, "");
  const { errors, warnings, notes } = await run({
    base,
    strictProduction: process.argv.includes("--strict-production"),
  });
  for (const n of notes) console.log(`OK    ${n}`);
  for (const w of warnings) console.warn(`WARN  ${w}`);
  for (const e of errors) console.error(`FAIL  ${e}`);
  console.log(
    errors.length
      ? `\n${errors.length} problem(s) on ${base}`
      : `\nAll adventure guide links OK on ${base}`,
  );
  process.exit(errors.length ? 1 : 0);
}
