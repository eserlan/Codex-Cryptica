import { describe, expect, it } from "vitest";
import { prerender, trailingSlash } from "./+page";
import { PRERENDER_ENTRIES } from "#lib/config/prerender-entries.js";

describe("Help index route", () => {
  it("is prerendered so direct Help URLs receive a successful document response", () => {
    expect(prerender).toBe(true);
    expect(trailingSlash).toBe("always");
    expect(PRERENDER_ENTRIES).toContain("/help");
  });
});
