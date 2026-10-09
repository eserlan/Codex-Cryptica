import { describe, expect, it } from "vitest";
import { emptyHelpContext, sanitizeHelpContext } from "help-engine";
import { buildFallback, fallbackMessage } from "./help-fallback";

const titles: Record<string, string> = {
  "connections-tab": "Connections Tab",
  "connection-labels": "Connection Labels",
  "graph-basics": "Graph Basics",
};
const titleFor = (id: string) => titles[id] ?? null;

const connections = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
});

describe("buildFallback", () => {
  it("prefers the current Family or Stats guide over unrelated entity tabs", () => {
    const articles: Record<string, string> = {
      "family-tree": "Family Tree",
      "stat-sheets": "Stat Sheets",
      ...titles,
    };
    const deps = { titleFor: (id: string) => articles[id] ?? null };
    const family = buildFallback(
      { kind: "offline" },
      sanitizeHelpContext({
        area: "entity-detail",
        entityKind: "character",
        tab: "family",
      }),
      deps,
    );
    expect(family.topics.map((topic) => topic.helpId)).toContain("family-tree");
    expect(family.topics.map((topic) => topic.helpId)).not.toContain(
      "stat-sheets",
    );
    const stats = buildFallback(
      { kind: "offline" },
      sanitizeHelpContext({
        area: "entity-detail",
        entityKind: "item",
        tab: "stats",
      }),
      deps,
    );
    expect(stats.topics.map((topic) => topic.helpId)).toContain("stat-sheets");
    expect(stats.topics.map((topic) => topic.helpId)).not.toContain(
      "family-tree",
    );
  });
  it("links the static Connections help for an entity screen, with no network needed", () => {
    const fb = buildFallback({ kind: "offline" }, connections, { titleFor });
    expect(fb.topics.map((t) => t.helpId)).toEqual([
      "connections-tab",
      "connection-labels",
    ]);
    expect(fb.showLibrary).toBe(false);
    expect(fb.message).toMatch(/offline/i);
  });

  it("names Cif rather than a generic assistant when it cannot answer", () => {
    expect(fallbackMessage({ kind: "offline" })).toMatch(/Cif/);
    for (const kind of [
      "offline",
      "unauthorised",
      "rate-limited",
      "server",
      "timeout",
      "invalid-response",
    ] as const) {
      expect(fallbackMessage({ kind }), kind).not.toMatch(/help assistant/i);
    }
  });

  it("uses plain-language wording for each failure kind", () => {
    const kinds = [
      "offline",
      "unauthorised",
      "rate-limited",
      "server",
      "timeout",
      "invalid-response",
    ] as const;
    for (const kind of kinds) {
      const message = fallbackMessage({ kind });
      expect(message.length, kind).toBeGreaterThan(20);
      expect(message, kind).not.toMatch(
        /\b(401|429|5\d\d|JSON|token|worker)\b/i,
      );
    }
    expect(fallbackMessage({ kind: "rate-limited" })).toMatch(/moment/);
  });

  it("explains a too-long question without offering unrelated topics as the main message", () => {
    expect(
      fallbackMessage({ kind: "bad-request", code: "QUESTION_TOO_LONG" }),
    ).toMatch(/500/);
  });

  it("points to the help library when the screen has no specific topic", () => {
    const fb = buildFallback({ kind: "server" }, emptyHelpContext(), {
      titleFor,
    });
    expect(fb.topics).toEqual([]);
    expect(fb.showLibrary).toBe(true);
  });

  it("skips articles that are not available instead of linking to nothing", () => {
    const fb = buildFallback({ kind: "server" }, connections, {
      titleFor: (id) =>
        id === "connection-labels" ? "Connection Labels" : null,
    });
    expect(fb.topics.map((t) => t.helpId)).toEqual(["connection-labels"]);
  });

  it("stays silent for a user cancel", () => {
    expect(fallbackMessage({ kind: "aborted" })).toBe("");
  });
});
