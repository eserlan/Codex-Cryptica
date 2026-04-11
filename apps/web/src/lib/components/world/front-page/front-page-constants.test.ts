import { describe, expect, it } from "vitest";
import {
  FRONTPAGE_CONTEXT_MAX_CHARS,
  FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS,
  DEFAULT_RECENT_LIMIT,
  MIN_RECENT_LIMIT,
  MAX_RECENT_LIMIT,
} from "./front-page-constants";

describe("front-page-constants", () => {
  it("exports FRONTPAGE_CONTEXT_MAX_CHARS", () => {
    expect(FRONTPAGE_CONTEXT_MAX_CHARS).toBe(2400);
  });

  it("exports FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS", () => {
    expect(FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS).toBe(900);
  });

  it("exports DEFAULT_RECENT_LIMIT as 6", () => {
    expect(DEFAULT_RECENT_LIMIT).toBe(6);
  });

  it("exports MIN_RECENT_LIMIT as 1", () => {
    expect(MIN_RECENT_LIMIT).toBe(1);
  });

  it("exports MAX_RECENT_LIMIT as 24", () => {
    expect(MAX_RECENT_LIMIT).toBe(24);
  });
});
