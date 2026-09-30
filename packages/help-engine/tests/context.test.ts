import { describe, expect, it } from "vitest";
import {
  HELP_CONTEXT_KEYS,
  emptyHelpContext,
  parseHelpContext,
  sanitizeHelpContext,
} from "../src/context";

const settlementConnections = {
  v: 1,
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  flags: [],
  availableActions: ["status-tab", "connections-tab"],
};

describe("HelpContextV1", () => {
  it("accepts the Settlement → Connections screen description", () => {
    const parsed = parseHelpContext(settlementConnections);
    expect(parsed.ok).toBe(true);
  });

  it("rejects an unknown key instead of silently accepting it", () => {
    expect(
      parseHelpContext({ ...settlementConnections, entityTitle: "Oakvale" }).ok,
    ).toBe(false);
  });

  it("rejects a resolved path that could carry an identifier", () => {
    expect(
      parseHelpContext({
        ...settlementConnections,
        routeTemplate:
          "/vault/3f2a9c1e-7b1d-4f6a-9c3e-0a1b2c3d4e5f/entity/9b1c",
      }).ok,
    ).toBe(false);
  });

  it("rejects off-list surfaces, areas and action IDs", () => {
    expect(
      parseHelpContext({ ...settlementConnections, surface: "admin" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({ ...settlementConnections, area: "secret" }).ok,
    ).toBe(false);
    expect(
      parseHelpContext({
        ...settlementConnections,
        availableActions: ["delete-vault"],
      }).ok,
    ).toBe(false);
  });

  it("pins the exact key set so additions are a reviewed change", () => {
    expect(HELP_CONTEXT_KEYS).toEqual(
      [
        "area",
        "availableActions",
        "entityKind",
        "flags",
        "mode",
        "routeTemplate",
        "surface",
        "tab",
        "v",
      ].sort(),
    );
  });
});

describe("sanitizeHelpContext", () => {
  it("collapses a user-defined category to custom", () => {
    expect(
      sanitizeHelpContext({
        ...settlementConnections,
        entityKind: "Settlement",
      }).entityKind,
    ).toBe("custom");
  });

  it("keeps a built-in category and a null category", () => {
    expect(sanitizeHelpContext(settlementConnections).entityKind).toBe(
      "location",
    );
    expect(
      sanitizeHelpContext({ ...settlementConnections, entityKind: null })
        .entityKind,
    ).toBeNull();
  });

  it("drops extra keys, unknown flags and unknown actions, and maps an unknown route", () => {
    const out = sanitizeHelpContext({
      ...settlementConnections,
      routeTemplate: "/vault/abc123",
      entityId: "9b1c",
      entityTitle: "Oakvale",
      flags: ["generators", "nope"],
      availableActions: ["status-tab", "nope"],
    });
    expect(out.routeTemplate).toBe("unknown");
    expect(out.flags).toEqual(["generators"]);
    expect(out.availableActions).toEqual(["status-tab"]);
    expect(Object.keys(out).sort()).toEqual(HELP_CONTEXT_KEYS);
    expect(parseHelpContext(out).ok).toBe(true);
  });

  it("always yields a valid general-guide description for junk input", () => {
    for (const junk of [undefined, null, 42, "x", []]) {
      expect(parseHelpContext(sanitizeHelpContext(junk)).ok).toBe(true);
    }
    expect(emptyHelpContext().area).toBe("other");
  });

  it("never produces the reserved public surface for an unknown value", () => {
    expect(sanitizeHelpContext({ surface: "admin" }).surface).toBe("vault");
  });
});
