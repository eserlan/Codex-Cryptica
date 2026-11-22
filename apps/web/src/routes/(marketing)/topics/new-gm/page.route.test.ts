/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import * as schema from "schema";
import Page from "./+page.svelte";

const themes = new Map(
  [
    ...Object.values(schema.THEMES),
    ...Object.values(schema).filter(
      (value): value is schema.StylingTemplate =>
        typeof value === "object" &&
        value !== null &&
        "tokens" in value &&
        /_(dark|light)$/.test(String((value as { id?: unknown }).id ?? "")),
    ),
  ].map((theme) => [theme.id, theme]),
);

describe("/topics/new-gm route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("renders a system-neutral accessible name for its jobs navigation", () => {
    const { container } = render(Page);
    const navigation = container.querySelector(
      'nav[aria-label="First session steps"]',
    );

    expect(navigation).not.toBeNull();
    const firstStep = navigation?.querySelector("a");
    expect(firstStep?.className).toContain("border-theme-text");
    expect(firstStep?.className).toContain("hover:text-theme-text");
    expect(firstStep?.className).toContain("focus-visible:outline-theme-text");
  });

  it("uses a control boundary and focus token with 3:1 contrast in every theme", () => {
    for (const [id, { tokens }] of themes) {
      for (const background of [tokens.background, tokens.surface]) {
        const text = schema.parseColor(tokens.text);
        const surface = schema.parseColor(background);
        expect(text, `${id} text token`).not.toBeNull();
        expect(surface, `${id} background token`).not.toBeNull();
        expect(
          schema.contrastRatio(text!, surface!),
          `${id} control contrast`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
