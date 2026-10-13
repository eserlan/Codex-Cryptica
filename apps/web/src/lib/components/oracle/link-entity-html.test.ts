/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { linkEntityTitlesInHtml } from "./link-entity-html";

const elara = { id: "e-elara", title: "Elara Voss", type: "character" };

describe("linkEntityTitlesInHtml", () => {
  it("links a source title and keeps the surrounding markup", () => {
    const html = linkEntityTitlesInHtml(
      "<p>Elara Voss runs <strong>the</strong> school.</p>",
      [elara],
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector("a[data-entity-id]") as HTMLElement;
    expect(link.dataset.entityId).toBe("e-elara");
    expect(link.textContent).toBe("Elara Voss");
    expect(doc.querySelector("strong")?.textContent).toBe("the");
  });

  it("does not link inside code or an existing link", () => {
    const html = linkEntityTitlesInHtml(
      '<p><code>Elara Voss</code> and <a href="https://example.com">Elara Voss</a></p>',
      [elara],
    );
    expect(html).not.toContain("data-entity-id");
  });

  it("does not link a title split across tags", () => {
    const html = linkEntityTitlesInHtml("<p>Elara <em>Voss</em></p>", [elara]);
    expect(html).not.toContain("data-entity-id");
  });

  it("leaves the reply unchanged when no source entity is given", () => {
    const original = "<p>Elara Voss runs the school.</p>";
    expect(linkEntityTitlesInHtml(original, [])).toBe(original);
  });

  it("leaves an unrelated name plain", () => {
    const html = linkEntityTitlesInHtml("<p>Mira walks in.</p>", [elara]);
    expect(html).not.toContain("data-entity-id");
  });
});
