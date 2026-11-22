/** @vitest-environment jsdom */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appearanceStore } from "#lib/stores/appearance.svelte.js";
import { publicThemeStore } from "#lib/stores/public-theme.svelte.js";
import { ThemeStore, type IThemeStorage } from "#lib/stores/theme.svelte.js";
import {
  THEME_STORAGE_KEY,
  setPublicThemePreviewActive,
} from "#lib/theme/theme-dom.js";

vi.mock("$app/env", () => ({ browser: true }));
vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/state", () => ({
  page: {
    url: new URL("https://codexcryptica.com/generators/pirate"),
  },
}));
vi.mock("#lib/config/index.js", () => ({
  DISCORD_URL: "https://discord.gg/5UUMCChF2u",
  GITHUB_URL: "https://github.com/eserlan/Codex-Cryptica",
  PATREON_URL: "https://patreon.com/EspenE",
  VERSION: "0.36.0",
  SCHEMA_ORG: { "@context": "https://schema.org", "@type": "WebSite" },
  SITE_AUTHOR: { name: "Espen", url: "https://codexcryptica.com" },
}));

import MarketingLayout from "./+layout.svelte";

const SRC_ROOT = resolve(process.cwd(), "src");

const MARKETING_ENTRY_FILES = [
  "src/routes/+layout.svelte",
  "src/routes/(marketing)/+layout.svelte",
  "src/lib/components/seo/MarketingShell.svelte",
  "src/lib/components/blog/ArticleRenderer.svelte",
  "src/routes/(marketing)/generators/[theme=theme_hub]/HubAppearanceToggle.svelte",
  "src/lib/components/seo/GeneratorSwitcherMenu.svelte",
  "src/routes/(marketing)/blog/+page.svelte",
  "src/routes/(marketing)/blog/[slug]/+page.svelte",
];

const FORBIDDEN_TARGETS = [
  "vault.svelte",
  "utils/opfs",
  "utils/idb",
  "dexie",
  "vault-registry",
  "guest-vault",
  "vault-config",
  "modal-ui.svelte",
  "theme.svelte",
  "@codex/oracle-engine",
  "capacitor-bridge",
  "session-bootstrap",
];

function extractImportSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const staticRe =
    /(?:import|export)\s+(?:type\s+)?(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRe = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = staticRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  while ((match = dynamicRe.exec(source)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

function resolveLocalModule(
  fromFile: string,
  specifier: string,
): string | null {
  let candidateBase: string | null = null;
  if (specifier.startsWith("#lib/")) {
    candidateBase = resolve(SRC_ROOT, "lib", specifier.slice("#lib/".length));
  } else if (specifier.startsWith(".")) {
    candidateBase = resolve(dirname(fromFile), specifier);
  }
  if (!candidateBase) return null;

  const withoutJs = candidateBase.replace(/\.js$/, "");
  const candidates = [
    candidateBase,
    withoutJs,
    `${withoutJs}.ts`,
    `${withoutJs}.svelte.ts`,
    `${withoutJs}.svelte`,
    `${withoutJs}.js`,
    resolve(withoutJs, "index.ts"),
    resolve(withoutJs, "index.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

describe("Marketing & root layout boundary (#5094)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    publicThemeStore.clear();
    delete document.documentElement.dataset.worldTheme;
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    setPublicThemePreviewActive(false);
    cleanup();
  });

  it("reaches zero app/vault/capacitor/worker-session modules from root & marketing shell graph", () => {
    const visited = new Set<string>();
    const violations: string[] = [];

    function walk(filePath: string, chain: string[]) {
      if (visited.has(filePath)) return;
      visited.add(filePath);

      const source = readFileSync(filePath, "utf8");
      for (const spec of extractImportSpecifiers(source)) {
        const forbidden = FORBIDDEN_TARGETS.find((pattern) => {
          if (pattern === "session-bootstrap") {
            return (
              /(?:^|\/)session-bootstrap(?:\.|$)/.test(spec) &&
              !spec.includes("public-session-bootstrap")
            );
          }
          if (pattern === "theme.svelte") {
            return /(?:^|\/)theme\.svelte(?:\.|$)/.test(spec);
          }
          return spec.includes(pattern);
        });
        if (forbidden) {
          violations.push(
            `${[...chain, `${spec} (matched ${forbidden})`].join(" -> ")}`,
          );
          continue;
        }

        const resolved = resolveLocalModule(filePath, spec);
        if (resolved) {
          walk(resolved, [...chain, resolved.replace(`${SRC_ROOT}/`, "src/")]);
        }
      }
    }

    for (const rel of MARKETING_ENTRY_FILES) {
      const abs = resolve(process.cwd(), rel);
      walk(abs, [rel]);
    }

    expect(violations).toEqual([]);
  });

  it("keeps root +layout.svelte free of capacitor-bridge and session-bootstrap", () => {
    const rootLayout = readFileSync(
      resolve(process.cwd(), "src/routes/+layout.svelte"),
      "utf8",
    );
    expect(rootLayout).not.toContain("capacitor-bridge");
    expect(rootLayout).not.toContain("session-bootstrap");
  });

  it("applies public theme preview on mount without writing localStorage and resets on unmount", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    publicThemeStore.setTheme("pirate");
    setItemSpy.mockClear();

    const children = createRawSnippet(() => ({
      render: () => "<p>Marketing Content</p>",
    }));

    const { unmount } = render(MarketingLayout, { props: { children } });

    expect(document.documentElement.dataset.worldTheme).toBe("pirate");
    expect(
      document.documentElement.style.getPropertyValue("--color-accent-primary"),
    ).not.toBe("");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalledWith(
      THEME_STORAGE_KEY,
      expect.anything(),
    );

    unmount();

    expect(document.documentElement.dataset.worldTheme).toBe("workspace");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();

    setItemSpy.mockRestore();
  });

  it("keeps public pirate preview active when ThemeStore is instantiated or appearance toggles, until unmount and init()", async () => {
    publicThemeStore.setTheme("pirate");
    const children = createRawSnippet(() => ({
      render: () => "<p>Marketing Content</p>",
    }));
    const { unmount } = render(MarketingLayout, { props: { children } });
    expect(document.documentElement.dataset.worldTheme).toBe("pirate");

    const mockThemeStorage: IThemeStorage = {
      loadLocal: () => null,
      saveLocal: vi.fn(),
      loadAppAppearance: () => null,
      saveAppAppearance: vi.fn(),
      loadFromCache: vi.fn().mockResolvedValue(null),
      saveToCache: vi.fn().mockResolvedValue(undefined),
      loadFromDisk: vi.fn().mockResolvedValue(null),
      saveToDisk: vi.fn().mockResolvedValue(undefined),
    };
    const store = new ThemeStore(
      { isDemoMode: false, isGuestMode: false } as any,
      () => ({ activeVaultId: null }),
      mockThemeStorage,
      appearanceStore,
    );
    await tick();
    expect(document.documentElement.dataset.worldTheme).toBe("pirate");

    appearanceStore.setAppAppearance("neutral-dark", false);
    await tick();
    expect(document.documentElement.dataset.worldTheme).toBe("pirate");
    expect(document.documentElement.dataset.theme).toBe("pirate_dark");

    appearanceStore.setAppAppearance("neutral-light", false);
    await tick();
    expect(document.documentElement.dataset.worldTheme).toBe("pirate");
    expect(document.documentElement.dataset.theme).toBe("pirate");

    unmount();
    await store.init();
    expect(document.documentElement.dataset.worldTheme).toBe("workspace");
  });
});
