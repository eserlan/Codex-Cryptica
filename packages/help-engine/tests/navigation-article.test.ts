import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The overview article names every Activity Bar button and every control in
 * the top bar. The surface audit makes a new button force a Help decision, but
 * not an edit to this article, so it would quietly go out of date. This is the
 * check that keeps the lists the same as nav-items.ts and the header
 * components.
 */
const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

/** Buttons whose label is a plain string in nav-items.ts. */
export function navLabels(navSource: string): string[] {
  return [...navSource.matchAll(/^\s+label: "([^"]+)",$/gm)].map(
    (match) => match[1],
  );
}

/** Labels the article does not show in bold, the way its tables name them. */
export function missingLabels(
  labels: readonly string[],
  article: string,
): string[] {
  return labels.filter((label) => !article.includes(`**${label}**`));
}

/**
 * A plain-string attribute such as `title="Create"`. A long sentence is a
 * tooltip, not the control's name, and `{...}` is computed, so both are left
 * out.
 */
export function staticAttr(source: string, attr: string): string[] {
  return [...source.matchAll(new RegExp(`\\b${attr}="([^"{}]{1,30})"`, "g"))]
    .map((match) => match[1])
    .filter((label) => /^[A-Z]/.test(label));
}

/** Items of the Manage vault menu, written as text after their icon. */
export function menuItemLabels(source: string): string[] {
  return [
    ...source.matchAll(/<\/span>([A-Z][A-Za-z ]+)\r?\n\s*<\/button>/g),
  ].map((match) => match[1]);
}

const component = (name: string) => read(`apps/web/src/lib/components/${name}`);

/** The controls in the top bar that have a fixed name. */
export function topBarLabels(): string[] {
  const vaultMenu = component("layout/VaultActionsMenu.svelte");
  return [
    ...staticAttr(component("layout/AppHeader.svelte"), "title"),
    ...staticAttr(component("VaultControls.svelte"), "title"),
    ...staticAttr(vaultMenu, "title"),
    ...menuItemLabels(vaultMenu),
    ...staticAttr(component("layout/DriveStatus.svelte"), "aria-label"),
    ...staticAttr(component("layout/P2PStatus.svelte"), "aria-label"),
  ];
}

const nav = read("apps/web/src/lib/components/layout/nav-items.ts");
const article = read(
  "apps/web/src/lib/content/help/finding-your-way-around.md",
);

describe("sidebar overview article", () => {
  it("finds the buttons it is meant to check", () => {
    expect(navLabels(nav).length).toBeGreaterThan(8);
  });

  it("names every Activity Bar button", () => {
    expect(missingLabels(navLabels(nav), article)).toEqual([]);
  });

  it("names the buttons that do not have a plain label", () => {
    // The journal button's label changes with its state, and Ask Cif is not
    // part of nav-items.ts, so neither is found by the check above.
    expect(article).toContain("Session Journal");
    expect(article).toContain("**Ask Cif**");
  });

  it("reports a button the article leaves out", () => {
    const withNew = `${nav}\n      label: "Brand New",\n`;
    expect(missingLabels(navLabels(withNew), article)).toEqual(["Brand New"]);
  });
});

/** The source of one nav item, from its id up to the next item's id. */
export function navItemSource(navSource: string, id: string): string {
  const start = navSource.indexOf(`id: "${id}"`);
  if (start < 0) return "";
  const next = navSource.indexOf("\n    items.push", start);
  return navSource.slice(start, next < 0 ? undefined : next);
}

describe("which tools close when clicked again", () => {
  it("distinguishes toggling tools from the Session Journal button", () => {
    const journal = navItemSource(nav, "session-journal");
    expect(journal).toContain("openJournal()");
    expect(journal).not.toMatch(/toggle/i);
    expect(article).toContain("Some tools close when clicked again");
    expect(article).toContain(
      "The Session Journal button opens or focuses its tab",
    );
    expect(article).toContain("click **Notes** to close the window");
  });

  it("closes with the Notes button, which really toggles", () => {
    expect(navItemSource(nav, "quicknote")).toContain(
      "quickNoteStore.toggle()",
    );
  });

  it("finds nothing for a tool that does not exist", () => {
    expect(navItemSource(nav, "no-such-tool")).toBe("");
  });
});

describe("top bar section of the overview article", () => {
  it("finds the controls it is meant to check", () => {
    const labels = topBarLabels();
    for (const expected of [
      "Create",
      "Switch Vault",
      "Manage vault",
      "Import data",
      "Export backup",
      "Share campaign",
      "Application Settings",
    ])
      expect(labels).toContain(expected);
  });

  it("names every top bar control", () => {
    expect(missingLabels(topBarLabels(), article)).toEqual([]);
  });

  it("names the Guided Mode switch, which is two words in one button", () => {
    expect(article).toContain("**Guided**");
    expect(article).toContain("**Full Toolbox**");
  });

  it("reports a control the article leaves out", () => {
    const header = `${component("layout/AppHeader.svelte")}\n<button title="Brand New">`;
    expect(missingLabels(staticAttr(header, "title"), article)).toEqual([
      "Brand New",
    ]);
  });

  it("leaves a tooltip sentence and a computed title alone", () => {
    const source = `<b title="Keep this world as your own and start building"> <b title={x}> <b title="lower">`;
    expect(staticAttr(source, "title")).toEqual([]);
  });
});
