import { describe, it, expect } from "vitest";
import { matchesEntityQuery } from "./entity-search-match";

const warden = { title: "The Warden", aliases: ["Old Salt", "Keeper"] };

describe("matchesEntityQuery", () => {
  it("matches part of a title, ignoring case", () => {
    expect(matchesEntityQuery(warden, "ward")).toBe(true);
    expect(matchesEntityQuery(warden, "WARDEN")).toBe(true);
  });

  it("matches an alias, not just the title", () => {
    expect(matchesEntityQuery(warden, "old salt")).toBe(true);
    expect(matchesEntityQuery(warden, "keeper")).toBe(true);
  });

  it("rejects text that appears in neither", () => {
    expect(matchesEntityQuery(warden, "dragon")).toBe(false);
  });

  it("matches everything on an empty or blank query", () => {
    expect(matchesEntityQuery(warden, "")).toBe(true);
    expect(matchesEntityQuery(warden, "   ")).toBe(true);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(matchesEntityQuery(warden, "  warden  ")).toBe(true);
  });

  it("copes with an entity that has no aliases", () => {
    expect(matchesEntityQuery({ title: "Sunken Realm" }, "sunken")).toBe(true);
    expect(matchesEntityQuery({ title: "Sunken Realm" }, "warden")).toBe(false);
  });
});
