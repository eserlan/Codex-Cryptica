import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SETTINGS_TABS } from "../src/context";
import { FEATURE_REGISTRY } from "../src/registry";
import { buildRealBundle } from "./eval/evaluate";

/**
 * The surface audit in docs/help-assistant-coverage.md (#3615): every place a
 * person can go in the app has a Help decision. This is the check that makes
 * adding a surface force that decision.
 */
const MIN_NOTE = 12;

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

interface Row {
  surface: string;
  articles: string[];
  registry: string[];
  status: string;
  notes: string;
}

const list = (cell: string) =>
  cell.trim() === "—" || cell.trim() === ""
    ? []
    : cell.split(",").map((part) => part.trim());

export function parseAudit(doc: string): Row[] {
  const start = doc.indexOf("## Surface audit");
  if (start < 0) return [];
  return doc
    .slice(start)
    .split("\n")
    .filter((line) => /^\| (nav|route|settings):/.test(line))
    .map((line) => {
      const cells = line.split("|").slice(1, -1);
      return {
        surface: cells[0].trim(),
        articles: list(cells[1]),
        registry: list(cells[2]),
        status: cells[3].trim(),
        notes: (cells[4] ?? "").trim(),
      };
    });
}

type Registry = ReadonlyMap<string, readonly string[]>;

/** Rows and surfaces must match one to one. */
function matchProblems(
  rows: readonly Row[],
  surfaces: readonly string[],
): string[] {
  const problems: string[] = [];
  const known = new Set(surfaces);
  const seen = new Set<string>();

  for (const surface of surfaces)
    if (!rows.some((row) => row.surface === surface))
      problems.push(
        `${surface} has no row in the surface audit. Decide covered, article-only, gap or not-needed in docs/help-assistant-coverage.md.`,
      );
  for (const { surface } of rows) {
    if (seen.has(surface)) problems.push(`${surface} appears more than once`);
    seen.add(surface);
    if (!known.has(surface))
      problems.push(`${surface} no longer exists; remove its row`);
  }
  return problems;
}

/** Everything a row names must exist. */
function referenceProblems(
  row: Row,
  articleIds: ReadonlySet<string>,
  registry: Registry,
): string[] {
  const where = row.surface;
  return [
    ...row.articles
      .filter((id) => !articleIds.has(id))
      .map((id) => `${where}: unknown article "${id}"`),
    ...row.registry
      .filter((id) => !registry.has(id))
      .map((id) => `${where}: unknown registry entry "${id}"`),
  ];
}

/** A covered row's registry entries must really cite its articles. */
function coveredProblems(row: Row, registry: Registry): string[] {
  const where = row.surface;
  if (row.articles.length === 0 || row.registry.length === 0)
    return [`${where}: covered needs an article and a registry entry`];
  return row.registry
    .filter((id) => {
      const cited = registry.get(id) ?? [];
      return !row.articles.some((article) => cited.includes(article));
    })
    .map(
      (id) =>
        `${where}: registry entry ${id} does not cite any of the listed articles`,
    );
}

/** Each status must be honest about what the row has. */
const STATUS_CHECKS: Record<
  string,
  (row: Row, registry: Registry) => string[]
> = {
  covered: coveredProblems,
  "article-only": (row) =>
    row.articles.length > 0 && row.registry.length === 0
      ? []
      : [`${row.surface}: article-only means an article and no registry entry`],
  gap: (row) =>
    row.articles.length + row.registry.length === 0
      ? []
      : [`${row.surface}: a gap has no dedicated article or registry entry`],
  "not-needed": (row) =>
    row.registry.length === 0
      ? []
      : [`${row.surface}: not-needed should not have a registry entry`],
};

function statusProblems(row: Row, registry: Registry): string[] {
  const check = STATUS_CHECKS[row.status];
  return check
    ? check(row, registry)
    : [`${row.surface}: unknown status "${row.status}"`];
}

function reasonProblems(row: Row): string[] {
  const needsReason = row.status !== "covered";
  return needsReason && row.notes.length < MIN_NOTE
    ? [`${row.surface}: ${row.status} needs a reason in Notes`]
    : [];
}

export function auditProblems(
  rows: readonly Row[],
  surfaces: readonly string[],
  articleIds: ReadonlySet<string>,
  registry: Registry,
): string[] {
  return [
    ...matchProblems(rows, surfaces),
    ...rows.flatMap((row) => [
      ...referenceProblems(row, articleIds, registry),
      ...statusProblems(row, registry),
      ...reasonProblems(row),
    ]),
  ];
}

/** The surfaces that exist in the app right now. */
function realSurfaces(): string[] {
  const nav = [
    ...read("apps/web/src/lib/components/layout/nav-items.ts").matchAll(
      /^\s+id: "([a-z-]+)",$/gm,
    ),
  ].map((match) => `nav:${match[1]}`);
  const routes = readdirSync(new URL("apps/web/src/routes/(app)/", root), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => `route:${entry.name}`);
  // The modal is where a tab is really added; the engine's list must follow it.
  const modalTabs = [
    ...read(
      "apps/web/src/lib/components/settings/SettingsModal.svelte",
    ).matchAll(/\bid:\s*"([a-z-]+)",\s*label:/g),
  ].map((match) => match[1]);
  const settings = [...new Set([...SETTINGS_TABS, ...modalTabs])].map(
    (tab) => `settings:${tab}`,
  );
  return [...nav, ...routes, ...settings];
}

const bundle = buildRealBundle();
const articleIds = new Set(bundle.helpIds);
const registry = new Map(FEATURE_REGISTRY.map((f) => [f.id, f.helpIds]));
const doc = read("docs/help-assistant-coverage.md");

describe("surface audit", () => {
  it("finds the surfaces it is meant to check", () => {
    const surfaces = realSurfaces();
    expect(surfaces.filter((s) => s.startsWith("nav:")).length).toBeGreaterThan(
      8,
    );
    expect(
      surfaces.filter((s) => s.startsWith("route:")).length,
    ).toBeGreaterThan(8);
    // Every tab the engine knows is also a tab the modal shows.
    expect(surfaces.filter((s) => s.startsWith("settings:")).length).toBe(
      SETTINGS_TABS.length,
    );
  });

  it("has a valid Help decision for every navigation item, route and Settings tab", () => {
    expect(
      auditProblems(parseAudit(doc), realSurfaces(), articleIds, registry),
    ).toEqual([]);
  });
});

describe("the audit check itself", () => {
  const good: Row = {
    surface: "nav:graph",
    articles: ["graph-basics"],
    registry: ["graph-view"],
    status: "covered",
    notes: "",
  };
  const problemsFor = (rows: Row[], surfaces = ["nav:graph"]) =>
    auditProblems(rows, surfaces, articleIds, registry);

  it("accepts a covered surface", () => {
    expect(problemsFor([good])).toEqual([]);
  });

  it("prompts for a Help decision when a surface has no row", () => {
    expect(problemsFor([], ["nav:new-thing"])[0]).toMatch(
      /nav:new-thing has no row.*docs\/help-assistant-coverage\.md/,
    );
  });

  it("flags a row for a surface that was removed", () => {
    expect(problemsFor([good, { ...good, surface: "nav:gone" }])).toContain(
      "nav:gone no longer exists; remove its row",
    );
  });

  it("flags a duplicate row", () => {
    expect(problemsFor([good, good])).toContain(
      "nav:graph appears more than once",
    );
  });

  it("rejects an unknown status", () => {
    expect(problemsFor([{ ...good, status: "done" }])).toContain(
      'nav:graph: unknown status "done"',
    );
  });

  it("rejects an article or registry entry that does not exist", () => {
    const problems = problemsFor([
      { ...good, articles: ["no-such-article"], registry: ["no-such-entry"] },
    ]);
    expect(problems).toContain('nav:graph: unknown article "no-such-article"');
    expect(problems).toContain(
      'nav:graph: unknown registry entry "no-such-entry"',
    );
  });

  it("requires covered to have both an article and a registry entry", () => {
    expect(problemsFor([{ ...good, registry: [] }])).toContain(
      "nav:graph: covered needs an article and a registry entry",
    );
  });

  it("requires a covered registry entry to cite one of the listed articles", () => {
    expect(problemsFor([{ ...good, articles: ["chronology"] }])).toContain(
      "nav:graph: registry entry graph-view does not cite any of the listed articles",
    );
  });

  it("requires a reason for anything that is not covered", () => {
    for (const status of ["article-only", "gap", "not-needed"]) {
      const row: Row = {
        surface: "nav:graph",
        articles: status === "article-only" ? ["graph-basics"] : [],
        registry: [],
        status,
        notes: "",
      };
      expect(problemsFor([row]), status).toContain(
        `nav:graph: ${status} needs a reason in Notes`,
      );
    }
  });

  it("keeps each status honest about what it has", () => {
    expect(
      problemsFor([
        { ...good, status: "gap", notes: "no article of its own at all" },
      ]),
    ).toContain("nav:graph: a gap has no dedicated article or registry entry");
    expect(
      problemsFor([
        {
          ...good,
          status: "article-only",
          notes: "no registry entry yet here",
        },
      ]),
    ).toContain(
      "nav:graph: article-only means an article and no registry entry",
    );
  });
});
