import { beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  basePathProblems,
  changedLines,
  checkSource,
  classVariants,
  contrastProblems,
  contrastRatio,
  loadThemes,
  modalFocusProblems,
  parseColour,
  problemTouchesChangedLines,
  remoteImageProblems,
  resolveConcatProblems,
  timerProblems,
  visualOrderProblems,
} from "./check-ui-patterns.mjs";

let themes;
beforeAll(async () => {
  themes = await loadThemes();
});

const rules = (source, file = "Component.svelte") =>
  checkSource(source, file, themes).map((problem) => problem.rule);

describe("stat sheet template settings contrast", () => {
  it.each([
    "settings/StatSheetBuiltInTemplates.svelte",
    "settings/StatSheetCategoryDefaults.svelte",
    "settings/StatSheetPresentationSettings.svelte",
    "settings/StatSheetTemplatePreview.svelte",
    "settings/StatSheetTemplateSettings.svelte",
    "settings/StatSheetTemplateToggle.svelte",
    "settings/StatSheetVaultTemplates.svelte",
    "stats/presentation/PresentationTemplateManager.svelte",
  ])("keeps %s readable in every theme", (component) => {
    const file = `apps/web/src/lib/components/${component}`;
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    expect(
      checkSource(source, file, themes).filter(
        (problem) => problem.rule === "contrast",
      ),
    ).toEqual([]);
  });
});

describe("colour maths", () => {
  it("parses hex and rgba", () => {
    expect(parseColour("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColour("rgba(22, 163, 74, 0.5)")).toEqual([22, 163, 74, 0.5]);
    expect(parseColour("color-mix(in srgb, red, blue)")).toBeNull();
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });

  it("loads every light and dark theme template", () => {
    const ids = themes.map((theme) => theme.id);
    expect(ids).toContain("horror");
    expect(ids).toContain("cyberpunk_light");
    expect(ids).toContain("workspace_dark");
  });
});

describe("contrast — cases PR review flagged", () => {
  it.each([
    [
      "faded body text (#4394)",
      '<p class="mt-1 text-sm text-theme-text/75">x</p>',
    ],
    [
      "primary label on a primary tint (#4396)",
      '<button class="bg-theme-primary/10 text-micro text-theme-primary">x</button>',
    ],
    [
      "faded hint inside a ternary branch (#4394)",
      `<span class="gap-1 {copied ? 'text-theme-primary' : 'text-theme-text/50'}">x</span>`,
    ],
    [
      "background-coloured text on a primary fill",
      '<button class="bg-theme-primary text-theme-bg">x</button>',
    ],
    [
      "danger text in light themes (#4968)",
      '<p class="text-sm text-theme-danger">Image failed to save.</p>',
    ],
    [
      "warning text in light themes (#4968)",
      '<p class="text-sm text-theme-warning">Partial import.</p>',
    ],
  ])("flags %s", (_label, source) => {
    expect(rules(source)).toContain("contrast");
  });

  it.each([
    ["full-strength body text", '<p class="text-sm text-theme-text">x</p>'],
    [
      "on-primary text on a primary fill",
      '<button class="bg-theme-primary text-theme-on-primary">x</button>',
    ],
  ])("passes %s", (_label, source) => {
    expect(rules(source)).not.toContain("contrast");
  });

  it("flags low-contrast hover, disabled, and focus indicators (state-contrast)", () => {
    expect(
      rules('<a class="text-theme-text hover:text-theme-primary/40">x</a>'),
    ).toContain("state-contrast");
    expect(
      rules(
        '<button class="bg-theme-primary text-theme-on-primary hover:opacity-90">Continue</button>',
      ),
    ).toContain("state-contrast");
    expect(
      rules(
        '<button class="text-theme-text disabled:opacity-35">Next</button>',
      ),
    ).toContain("state-contrast");
    expect(
      rules(
        '<button class="text-theme-text focus-visible:ring-theme-border">Save</button>',
      ),
    ).toContain("state-contrast");
    expect(
      rules(
        '<button class="text-theme-text hover:text-theme-text focus-visible:ring-theme-text">Save</button>',
      ),
    ).not.toContain("state-contrast");
  });

  it("flags sub-minimum UI font sizes (min-text-size)", () => {
    expect(
      rules('<button class="text-theme-text">Cancel</button>'),
    ).not.toContain("min-text-size");
    expect(
      rules('<p class="text-[11px] text-theme-text">Status</p>'),
    ).toContain("min-text-size");
    expect(
      rules('<span class="sm:text-[10px] text-theme-text">Note</span>'),
    ).toContain("min-text-size");
    expect(
      rules('<p class="text-xs text-theme-text">Readable</p>'),
    ).not.toContain("min-text-size");
  });

  it("flags low-contrast outlined interactive control borders (border-contrast)", () => {
    expect(
      rules(
        '<button class="border border-theme-border text-theme-text">Cancel</button>',
      ),
    ).toContain("border-contrast");
    expect(
      rules('<input class="border border-theme-border text-theme-text" />'),
    ).toContain("border-contrast");
    expect(
      rules('<input class="md:border border-theme-border text-theme-text" />'),
    ).toContain("border-contrast");
    expect(
      rules(
        '<input class="border-0 md:border border-theme-border text-theme-text" />',
      ),
    ).toContain("border-contrast");
    expect(
      rules(
        '<input class="border-0 md:border-0 border-theme-border text-theme-text" />',
      ),
    ).not.toContain("border-contrast");
    expect(
      rules('<input class="border-x-2 border-theme-border text-theme-text" />'),
    ).toContain("border-contrast");
    // Decorative container borders are not interactive control boundaries
    expect(
      rules(
        '<div class="border border-theme-border text-theme-text">Card</div>',
      ),
    ).not.toContain("border-contrast");
    // Solid-fill primary buttons do not rely on their border for boundary contrast
    expect(
      rules(
        '<button class="bg-theme-primary text-theme-on-primary border border-theme-border">Save</button>',
      ),
    ).not.toContain("border-contrast");
    // Full-strength border passes
    expect(
      rules(
        '<button class="border border-theme-text text-theme-text">Cancel</button>',
      ),
    ).not.toContain("border-contrast");
  });

  it("holds icons to 3:1 rather than 4.5:1", () => {
    const variants = classVariants(
      '<span class="icon-[lucide--x] text-theme-text/60"></span>',
    );
    expect(variants[0].map((t) => t.name)).toContain("icon-[lucide--x]");
  });

  it("uses the normal-text threshold for unbold text-xl", () => {
    const variant = (className) =>
      classVariants(`<span class="${className}">x</span>`)[0];
    const lowContrastTheme = [
      {
        id: "test",
        tokens: {
          background: "#000000",
          surface: "#000000",
          text: "#707070",
        },
      },
    ];
    expect(
      contrastProblems(variant("text-xl text-theme-text"), lowContrastTheme),
    ).toHaveLength(1);
    expect(
      contrastProblems(
        variant("text-xl font-bold text-theme-text"),
        lowContrastTheme,
      ),
    ).toHaveLength(0);
    expect(
      contrastProblems(variant("text-2xl text-theme-text"), lowContrastTheme),
    ).toHaveLength(0);
  });

  it("keeps a contrast issue when only its background line changed", () => {
    const [problem] = contrastProblems(
      [
        { name: "text-theme-primary", line: 4 },
        { name: "bg-theme-primary/10", line: 9 },
      ],
      [
        {
          id: "test",
          tokens: {
            background: "#ffffff",
            surface: "#ffffff",
            primary: "#888888",
          },
        },
      ],
    );
    expect(problem.lines).toEqual([4, 9]);
    expect(problemTouchesChangedLines(problem, new Set([9]))).toBe(true);
  });
});

describe("pattern rules", () => {
  it("flags renderMarkdown without allowImages: false", () => {
    expect(remoteImageProblems("renderMarkdown(text)")).toHaveLength(1);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { inline: true, allowImages: false })",
      ),
    ).toHaveLength(0);
    expect(
      remoteImageProblems(
        "renderMarkdown(fn(a, b), {\n  allowImages: false,\n})",
      ),
    ).toHaveLength(0);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { flags: { allowImages: false } })",
      ),
    ).toHaveLength(1);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { /* allowImages: false */ inline: true })",
      ),
    ).toHaveLength(1);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { allowImages: false, ...options })",
      ),
    ).toHaveLength(1);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { allowImages: false, allowImages: true })",
      ),
    ).toHaveLength(1);
    expect(
      remoteImageProblems(
        "renderMarkdown(text, { ...options, allowImages: false })",
      ),
    ).toHaveLength(0);
  });

  it("flags a responsive order that differs from the base order (#4398)", () => {
    const flagged = classVariants(
      `<div class="col {lead ? 'order-2' : 'order-1'} lg:order-1">x</div>`,
    );
    expect(visualOrderProblems(flagged)).toHaveLength(1);
    expect(
      visualOrderProblems(
        classVariants('<div class="order-1 lg:order-1">x</div>'),
      ),
    ).toHaveLength(0);
    expect(
      visualOrderProblems(
        classVariants('<div class="order-1 sm:order-1 md:order-2">x</div>'),
      ),
    ).toHaveLength(1);
  });

  it("flags setTimeout in a component that never clears it (#4345)", () => {
    expect(
      timerProblems("setTimeout(() => (copied = false), 2000);", "A.svelte"),
    ).toHaveLength(1);
    expect(
      timerProblems(
        "t = setTimeout(f, 1); onDestroy(() => clearTimeout(t));",
        "A.svelte",
      ),
    ).toHaveLength(0);
    expect(
      timerProblems(
        "const first = setTimeout(f, 1); const second = setTimeout(g, 2); onDestroy(() => clearTimeout(first));",
        "A.svelte",
      ),
    ).toHaveLength(1);
    expect(
      timerProblems(
        "const timer = setTimeout(f, 1); clearTimeout(timer);",
        "A.svelte",
      ),
    ).toHaveLength(1);
    expect(
      timerProblems(
        "let timer; { const timer = setTimeout(f, 1); } onDestroy(() => clearTimeout(timer));",
        "A.svelte",
      ),
    ).toHaveLength(1);
    expect(
      timerProblems(
        "let timer; function schedule(timer) { timer = setTimeout(f, 1); } onDestroy(() => clearTimeout(timer));",
        "A.svelte",
      ),
    ).toHaveLength(1);
    expect(
      timerProblems(
        "let timer; timer = setTimeout(f, 1); onDestroy(() => clearTimeout(timer));",
        "A.svelte",
      ),
    ).toHaveLength(0);
    expect(timerProblems("setTimeout(f, 1)", "helper.ts")).toHaveLength(0);
  });

  it("flags root-relative navigation and service-worker URLs (PR #4412)", () => {
    for (const source of [
      'goto("/map");',
      "goto(`/canvas/${slug}`, { replaceState: true });",
      "replaceState('/', {});",
      'throw redirect(307, "/login");',
      'navigator.serviceWorker.register("/service-worker.js");',
    ])
      expect(basePathProblems(source)).toHaveLength(1);
  });

  it("accepts resolved, relative, external and non-literal URLs", () => {
    for (const source of [
      'goto(resolve("/map"));',
      "goto(`${base}/map`);",
      "goto(url);",
      'goto("?tab=lore");',
      'goto("//cdn.example.com/x");',
      'register("/x");',
      "redirect(307, resolve('/login'));",
      'navigator.serviceWorker.register(`${resolve("/(app)")}/service-worker.js`);',
    ])
      expect(basePathProblems(source)).toEqual([]);
  });

  it('flags a path appended to resolve("") (production //tools links)', () => {
    for (const source of [
      `<a href="{resolve('')}/answers">`,
      '<a href="{resolve("")}{link.href}">',
      "<a href=\"{resolve(\n  '',\n)}/?utm_source=x\">",
      'const url = `${resolve("")}/cif`;',
      '.replace(/x/g, `](${resolve("")}/`)',
      "const url = `${resolve('')}${path}`;",
      'const href = resolve("") + "/answers";',
    ])
      expect(resolveConcatProblems(source)).toHaveLength(1);
  });

  it('accepts resolve("") on its own and other resolve calls', () => {
    for (const source of [
      "<a href={resolve('')}>Home</a>",
      'await goto(resolve(""), { replaceState: true });',
      'const cleanBase = resolve("") === "/" ? "" : resolve("");',
      'href={resolve("") + redirectQuery}',
      "<a href=\"{resolve('/answers')}\">",
      '<a href="{basePath()}/answers">',
      'shellCtaHref(resolve(""), page.url.pathname, "logo")',
      'const tables = resolve("tables");',
    ])
      expect(resolveConcatProblems(source)).toEqual([]);
  });

  it("flags hand-rolled dialog markup without focusTrap or ModalShell (#4968)", () => {
    expect(
      modalFocusProblems(
        '<div role="dialog" aria-modal="true"><button>Close</button></div>',
        "MyDialog.svelte",
      ),
    ).toHaveLength(2);
    expect(
      modalFocusProblems(
        '<div role="dialog" aria-modal="true" use:focusTrap><button>Close</button></div>',
        "MyDialog.svelte",
      ),
    ).toEqual([]);
    expect(
      modalFocusProblems(
        '<ModalShell><div role="dialog" aria-modal="true">x</div></ModalShell>',
        "MyDialog.svelte",
      ),
    ).toEqual([]);
    expect(
      modalFocusProblems(
        '<ModalShell><div role="dialog" aria-modal="true">safe</div></ModalShell>\n<div role="dialog" aria-modal="true">untrapped</div>',
        "MyDialog.svelte",
      ),
    ).toHaveLength(2);
    expect(
      modalFocusProblems(
        '<div role="dialog" aria-modal="true">x</div>',
        "helper.ts",
      ),
    ).toEqual([]);
    expect(
      modalFocusProblems(
        '<div role="dialog" aria-modal="true">x</div>\n<p>Tab order matters.</p>\n<button on:click={() => opener.focus()}>Return</button>',
        "MyDialog.svelte",
      ),
    ).toHaveLength(2);
    expect(
      modalFocusProblems(
        '<div role="dialog" aria-modal="true" onkeydown={trap}>x</div>\nfunction trap(event) { if (event.key === "Tab") { event.preventDefault(); next.focus(); } }',
        "MyDialog.svelte",
      ),
    ).toEqual([]);
  });

  it("respects a ui-check-ignore comment on or above the line", () => {
    expect(
      rules(
        "// ui-check-ignore: trusted help content\nrenderMarkdown(text)",
        "a.ts",
      ),
    ).toEqual([]);
    expect(
      rules("renderMarkdown(text) // ui-check-ignore: trusted", "a.ts"),
    ).toEqual([]);
  });
});

describe("changedLines", () => {
  it("reads added line ranges from a zero-context diff", () => {
    const diff = [
      "+++ b/apps/web/A.svelte",
      "@@ -10,0 +11,2 @@",
      "@@ -20 +22 @@",
    ].join("\n");
    expect([...changedLines(diff).get("apps/web/A.svelte")]).toEqual([
      11, 12, 22,
    ]);
  });

  it("records nothing for a pure deletion", () => {
    const diff = ["+++ b/x.ts", "@@ -5,3 +4,0 @@"].join("\n");
    expect([...changedLines(diff).get("x.ts")]).toEqual([]);
  });
});
