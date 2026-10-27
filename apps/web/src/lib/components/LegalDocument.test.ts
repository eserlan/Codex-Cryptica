/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import LegalDocument from "./LegalDocument.svelte";

const doc =
  "# Terms\n\n## Using the app\n\nText.\n\n## Your data\n\nMore text.\n";

describe("LegalDocument", () => {
  it("builds a contents rail whose links match the rendered heading ids", () => {
    const { container } = render(LegalDocument, {
      props: { fileName: "TERMS.md", title: "Terms", initialContent: doc },
    });

    const rail = screen.getByTestId("legal-contents");
    expect(rail.className).toContain("lg:sticky");
    const links = [...rail.querySelectorAll("a")];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      "Using the app",
      "Your data",
    ]);
    for (const link of links) {
      const id = link.getAttribute("href")!.slice(1);
      expect(
        container.querySelector(`.legal-content [id="${id}"]`),
      ).not.toBeNull();
    }
  });

  it("keeps the text at reading width and skips the rail for a document with no sections", () => {
    const { container } = render(LegalDocument, {
      props: {
        fileName: "X.md",
        title: "X",
        initialContent: "Just a paragraph.",
      },
    });

    expect(container.querySelector(".legal-content")?.className).toContain(
      "max-w-3xl",
    );
    expect(screen.queryByTestId("legal-contents")).toBeNull();
  });
});
