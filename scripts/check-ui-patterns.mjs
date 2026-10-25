#!/usr/bin/env bun
// fallow-ignore-file complexity -- scripts/ are fallow entry points, so it cannot attribute coverage; every exported check is covered by check-ui-patterns.test.ts.
/**
 * Local UI checks for the defects PR review keeps finding (see
 * docs/local-pr-checks.md). Only lines changed against the base are reported,
 * so existing code does not block unrelated work.
 *
 *   contrast        text-theme-* colour (with any /NN opacity) against its
 *                   background in every theme template, light and dark:
 *                   4.5:1 for text, 3:1 for icons and large bold text.
 *   remote-images   renderMarkdown(...) without `allowImages: false`.
 *   visual-order    a base order-N with a different responsive sm:/md:/lg:
 *                   order, which splits visual order from keyboard order.
 *   timer-cleanup   component timers cleared from teardown cleanup by stored ID.
 *
 * Silence a reviewed line with a `ui-check-ignore: <reason>` comment on the
 * line itself or the line above.
 *
 * Usage: bun scripts/check-ui-patterns.mjs [--base <ref>] [--files a b ...]
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// ---------------------------------------------------------------- colours --

/** Parse #rgb, #rrggbb or rgb()/rgba() into [r, g, b, a]; null otherwise. */
export function parseColour(value) {
  if (typeof value !== "string") return null;
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h =
      hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  const rgb = value.match(
    /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/i,
  );
  if (rgb)
    return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]];
  return null;
}

/** Composite a colour with alpha over an opaque one. */
export function over(top, bottom) {
  const a = top[3];
  return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1);
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Theme token behind each semantic text-theme-* / bg-theme-* name. */
const TOKEN_FOR = {
  text: (t) => t.text,
  muted: (t) => t.mutedOverride ?? t.metaText ?? t.secondary,
  primary: (t) => t.primary,
  secondary: (t) => t.secondary,
  accent: (t) => t.accent,
  "on-primary": (t) => t.onPrimaryOverride ?? t.background,
  bg: (t) => t.background,
  surface: (t) => t.surface,
};

// ---------------------------------------------------------- class parsing --

/**
 * Class combinations an element can render with. A static class attribute
 * gives one; each quoted branch of an inline {cond ? 'a' : 'b'} adds one on
 * top of the static part. Each class keeps the line it appears on.
 */
export function classVariants(source) {
  const variants = [];
  const lineAt = (index) => source.slice(0, index).split("\n").length;
  const tokens = (text, offset) =>
    [...text.matchAll(/[^\s'"{}()?:]+(?::[^\s'"{}()?]+)*/g)].map((m) => ({
      name: m[0],
      line: lineAt(offset + m.index),
    }));

  for (const match of source.matchAll(/class="([^"]*)"/g)) {
    const body = match[1];
    const start = match.index + 'class="'.length;
    const staticPart = body.replace(/\{[^}]*\}/g, (m) => " ".repeat(m.length));
    const base = tokens(staticPart, start);
    const branches = [...body.matchAll(/'([^']*)'/g)];
    if (branches.length === 0) variants.push(base);
    for (const branch of branches)
      variants.push([...base, ...tokens(branch[1], start + branch.index + 1)]);
  }
  for (const match of source.matchAll(/class=\{([^}]*)\}/g)) {
    const start = match.index + "class={".length;
    for (const literal of match[1].matchAll(/"([^"]*)"|`([^`]*)`/g)) {
      const text = literal[1] ?? literal[2];
      variants.push(tokens(text, start + literal.index + 1));
    }
  }
  return variants;
}

const LARGE_TEXT = /^text-(2xl|[3-9]xl)$/;
const FG_CLASS =
  /^text-theme-(text|muted|primary|secondary|accent|on-primary|bg)(?:\/(\d+))?$/;
const BG_CLASS = /^bg-theme-(bg|surface|primary|accent|secondary)(?:\/(\d+))?$/;

/** 3:1 for icons and large bold text, 4.5:1 for everything else. */
function minimumRatio(names) {
  const isIcon = names.some((n) => n.startsWith("icon-["));
  const isLarge =
    names.some((n) => LARGE_TEXT.test(n)) ||
    (names.includes("text-xl") && names.includes("font-bold")) ||
    (names.includes("text-lg") && names.includes("font-bold"));
  return isIcon || isLarge ? 3 : 4.5;
}

/** A theme token with the class's /NN opacity, composited over a ground. */
function shownColour(tokens, [, name, alpha], ground) {
  const colour = parseColour(TOKEN_FOR[name](tokens));
  if (!colour) return null;
  const opacity = (alpha ? +alpha / 100 : 1) * colour[3];
  return over([...colour.slice(0, 3), opacity], ground);
}

/** Lowest ratio of the text over each ground the element can sit on. */
function themeRatio(tokens, fg, bg) {
  let lowest = Infinity;
  for (const value of [tokens.background, tokens.surface]) {
    const page = parseColour(value);
    const ground = page && (bg ? shownColour(tokens, bg, page) : page);
    const text = ground && shownColour(tokens, fg, ground);
    if (text) lowest = Math.min(lowest, contrastRatio(text, ground));
  }
  return lowest;
}

/** Contrast findings for one class combination across all themes. */
export function contrastProblems(variant, themes) {
  const fgToken = variant.find((t) => FG_CLASS.test(t.name));
  if (!fgToken) return [];
  const bgToken = variant.find((t) => BG_CLASS.test(t.name));
  const fg = fgToken.name.match(FG_CLASS);
  const bg = bgToken?.name.match(BG_CLASS);
  const minimum = minimumRatio(variant.map((t) => t.name));

  let worst = null;
  for (const theme of themes) {
    const ratio = themeRatio(theme.tokens, fg, bg);
    if (ratio < minimum && (!worst || ratio < worst.ratio))
      worst = { ratio, theme: theme.id };
  }
  if (!worst) return [];
  return [
    {
      rule: "contrast",
      line: fgToken.line,
      lines: bgToken ? [fgToken.line, bgToken.line] : [fgToken.line],
      message: `${fgToken.name}${bgToken ? ` on ${bgToken.name}` : ""} is ${worst.ratio.toFixed(2)}:1 in ${worst.theme} (needs ${minimum}:1). Use a full-strength token (e.g. text-theme-text) or text-theme-on-primary on primary fills.`,
    },
  ];
}

// ------------------------------------------------------ pattern checks ----

/** renderMarkdown calls that leave remote images allowed. */
export function remoteImageProblems(source) {
  const problems = [];
  for (const match of source.matchAll(/\brenderMarkdown\s*\(/g)) {
    const args = callArguments(source, match.index + match[0].length - 1);
    if (hasTopLevelFalseOption(args[1], "allowImages")) continue;
    problems.push({
      rule: "remote-images",
      line: source.slice(0, match.index).split("\n").length,
      message:
        "renderMarkdown without `allowImages: false` lets model or imported Markdown load remote images (tracking, IP leak). Pass `{ allowImages: false }` unless the content is trusted.",
    });
  }
  return problems;
}

/** Split call arguments while ignoring commas inside nested syntax and comments. */
function callArguments(source, openIndex) {
  const args = [];
  let start = openIndex + 1;
  const stack = [")"];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "{" || char === "[") {
      stack.push(char === "(" ? ")" : char === "{" ? "}" : "]");
      continue;
    }
    if (char === "," && stack.length === 1) {
      args.push(source.slice(start, i).trim());
      start = i + 1;
      continue;
    }
    if (char === stack.at(-1)) {
      if (stack.length === 1) {
        const last = source.slice(start, i).trim();
        if (last) args.push(last);
        return args;
      }
      stack.pop();
    }
  }
  return args;
}

/** Accept only a direct object-literal property, never a nested or commented one. */
function hasTopLevelFalseOption(argument, property) {
  if (!argument || argument[0] !== "{" || !argument.endsWith("}")) return false;
  const wrapped = `__options(${argument.slice(1, -1)})`;
  const fields = callArguments(wrapped, "__options".length);
  let isFalse = false;
  for (const field of fields) {
    const clean = field.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").trim();
    const option = clean.match(
      new RegExp(`^(?:\\b${property}\\b|['"]${property}['"])\\s*:\\s*(.*)$`),
    );
    if (clean.startsWith("...") || clean.startsWith("[")) isFalse = false;
    if (option) isFalse = option[1].trim() === "false";
  }
  return isFalse;
}

/** A base order differing from a responsive one on the same element. */
export function visualOrderProblems(variants) {
  const problems = [];
  for (const variant of variants) {
    const base = variant.find((t) => /^order-\d+$/.test(t.name));
    const responsive = variant.filter((t) =>
      /^(sm|md|lg|xl|2xl):order-\d+$/.test(t.name),
    );
    const mismatches = responsive.filter(
      (token) => base && base.name !== token.name.split(":")[1],
    );
    if (!base || mismatches.length === 0) continue;
    problems.push({
      rule: "visual-order",
      line: base.line,
      message: `${base.name} with ${mismatches.map((token) => token.name).join(", ")} shows elements in a different order from the keyboard and screen-reader order at one breakpoint. Move the element in the DOM instead, or confirm the reordered block has no controls.`,
    });
  }
  return problems;
}

/** Timers in a component without matching teardown cleanup by stored ID. */
export function timerProblems(source, file) {
  if (!file.endsWith(".svelte")) return [];
  return [...source.matchAll(/\bsetTimeout\s*\(/g)]
    .filter((match) => {
      const before = source.slice(Math.max(0, match.index - 120), match.index);
      const assigned = before.match(
        /(?:const|let|var)\s+([\w$]+)\s*=\s*$|([\w$]+)\s*=\s*$/,
      );
      const timerId = assigned?.[1] ?? assigned?.[2];
      if (!timerId) return true;
      // Without a parser, a repeated declaration makes name-based cleanup
      // matching ambiguous: the cleanup may refer to a shadowing binding.
      if (hasAmbiguousTimerBinding(source, timerId)) return true;
      return !hasTimerCleanup(source, timerId);
    })
    .map((match) => ({
      rule: "timer-cleanup",
      line: source.slice(0, match.index).split("\n").length,
      message:
        "setTimeout without teardown cleanup in this component: clear its stored timer ID in an $effect cleanup or onDestroy.",
    }));
}

function hasAmbiguousTimerBinding(source, timerId) {
  const escaped = timerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const declarations = new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\b`, "g");
  return [...source.matchAll(declarations)].length > 1;
}

function hasTimerCleanup(source, timerId) {
  const escaped = timerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const clear = `clearTimeout\\s*\\(\\s*${escaped}\\s*\\)`;
  const teardown = [...source.matchAll(/\bonDestroy\s*\(/g)].some((match) =>
    callArguments(source, match.index + match[0].lastIndexOf("(")).some((arg) =>
      new RegExp(clear).test(arg),
    ),
  );
  const effectCleanup = [...source.matchAll(/\$effect\s*\(/g)].some((match) => {
    const effect = callArguments(
      source,
      match.index + match[0].lastIndexOf("("),
    )[0];
    return (
      effect &&
      new RegExp(`return\\s*\\(\\s*\\)\\s*=>[\\s\\S]*?${clear}`).test(effect)
    );
  });
  return teardown || effectCleanup;
}

export function problemTouchesChangedLines(problem, lines) {
  return (
    !lines || (problem.lines ?? [problem.line]).some((line) => lines.has(line))
  );
}

/** Drop problems on lines marked `ui-check-ignore`. */
export function withoutIgnored(problems, source) {
  const lines = source.split("\n");
  return problems.filter((problem) => {
    const here = lines[problem.line - 1] ?? "";
    const above = lines[problem.line - 2] ?? "";
    return !/ui-check-ignore/.test(here) && !/ui-check-ignore/.test(above);
  });
}

export function checkSource(source, file, themes) {
  const problems = [...remoteImageProblems(source)];
  if (file.endsWith(".svelte")) {
    const variants = classVariants(source);
    for (const variant of variants)
      problems.push(...contrastProblems(variant, themes));
    problems.push(
      ...visualOrderProblems(variants),
      ...timerProblems(source, file),
    );
  }
  return withoutIgnored(problems, source);
}

// ------------------------------------------------------------------- CLI --

export async function loadThemes() {
  const module = await import("../packages/schema/src/theme-templates.ts");
  const all = new Map();
  const add = (template) => {
    if (template?.tokens && template.id) all.set(template.id, template);
  };
  for (const value of Object.values(module)) {
    add(value);
    if (value && typeof value === "object" && !value.tokens)
      for (const nested of Object.values(value)) add(nested);
  }
  return withCssOverrides([...all.values()], readFileSync(APP_CSS, "utf8"));
}

const APP_CSS = new URL("../apps/web/src/app.css", import.meta.url);

/**
 * app.css overrides a few tokens per theme (`--color-theme-on-primary`,
 * `--color-text-muted`); fold them into the theme tokens the checks read.
 */
export function withCssOverrides(themes, css) {
  const overrides = new Map();
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const ids = [...block[1].matchAll(/data-theme="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const onPrimary = block[2].match(
      /--color-theme-on-primary:\s*(#[0-9a-f]{3,6})/i,
    );
    const muted = block[2].match(/--color-text-muted:\s*(#[0-9a-f]{3,6})/i);
    for (const id of ids) {
      const entry = overrides.get(id) ?? {};
      if (onPrimary) entry.onPrimaryOverride = onPrimary[1];
      if (muted) entry.mutedOverride = muted[1];
      overrides.set(id, entry);
    }
  }
  return themes.map((theme) => ({
    ...theme,
    tokens: { ...theme.tokens, ...(overrides.get(theme.id) ?? {}) },
  }));
}

/** Changed line numbers per file against the base, from a zero-context diff. */
export function changedLines(diff) {
  const result = new Map();
  let file = null;
  for (const line of diff.split("\n")) {
    const header = line.match(/^\+\+\+ b\/(.+)$/);
    if (header) {
      file = header[1];
      result.set(file, new Set());
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk && file) {
      const start = +hunk[1];
      const count = hunk[2] === undefined ? 1 : +hunk[2];
      for (let n = start; n < start + count; n++) result.get(file).add(n);
    }
  }
  return result;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const baseIndex = args.indexOf("--base");
  const base =
    baseIndex !== -1
      ? args[baseIndex + 1]
      : execFileSync("git", ["merge-base", "HEAD", "origin/staging"], {
          encoding: "utf8",
        }).trim();
  const diff = execFileSync(
    "git",
    ["diff", "-U0", base, "--", "*.svelte", "*.ts"],
    {
      encoding: "utf8",
    },
  );
  const changed = changedLines(diff);
  const filesIndex = args.indexOf("--files");
  const files =
    filesIndex !== -1 ? args.slice(filesIndex + 1) : [...changed.keys()];
  const themes = await loadThemes();

  let count = 0;
  for (const file of files) {
    if (!existsSync(file) || /\.test\.ts$|\.spec\.ts$/.test(file)) continue;
    const lines = changed.get(file);
    const problems = checkSource(
      readFileSync(file, "utf8"),
      file,
      themes,
    ).filter((problem) => problemTouchesChangedLines(problem, lines));
    for (const problem of problems) {
      count++;
      console.log(
        `${file}:${problem.line}  [${problem.rule}] ${problem.message}`,
      );
    }
  }
  if (count > 0) {
    console.log(
      `\n✖ ${count} UI pattern problem(s). Fix them, or add "ui-check-ignore: <reason>" on the line if reviewed.`,
    );
    process.exit(1);
  }
  console.log(
    `✅ UI patterns: no problems in changed lines (${themes.length} themes).`,
  );
}
