import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { importsConfig } from "$lib/config/seo-pages";

vi.mock("$app/paths", () => ({
  base: "",
}));

describe("Migration Hub", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("renders a card for every configured importer, linking to its /import/[slug] page", () => {
    render(Page);

    for (const importer of Object.values(importsConfig)) {
      const link = screen.getByRole("link", {
        name: new RegExp(importer.h1, "i"),
      });
      expect(link.getAttribute("href")).toBe(`/import/${importer.slug}`);
    }
  });

  it("includes the thread-weaver and scabard importers", () => {
    render(Page);

    expect(
      screen.getByRole("link", { name: /thread weaver campaign importer/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /scabard campaign importer/i }),
    ).toBeTruthy();
  });

  it("injects a breadcrumb JSON-LD schema", () => {
    render(Page);

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    let found = false;
    scripts.forEach((script) => {
      try {
        const json = JSON.parse(script.innerHTML);
        if (json["@type"] === "BreadcrumbList") {
          found = true;
          expect(json.itemListElement).toHaveLength(2);
        }
      } catch {
        // ignore
      }
    });
    expect(found).toBe(true);
  });

  it("renders without an internal navigation header", () => {
    const { container } = render(Page);
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("#logo-link")).toBeNull();
    expect(container.querySelector("#nav-cta-btn")).toBeNull();
  });
});
