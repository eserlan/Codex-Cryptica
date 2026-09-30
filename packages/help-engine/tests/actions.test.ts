import { describe, expect, it } from "vitest";
import {
  ACTION_TYPES,
  buildActionCandidates,
  validateAction,
  type ActionRef,
} from "../src/actions";
import { sanitizeHelpContext } from "../src/context";

const deps = { helpIds: new Set(["connections-tab", "graph-basics"]) };

const connectionsScreen = sanitizeHelpContext({
  routeTemplate: "/(app)",
  area: "entity-detail",
  entityKind: "location",
  tab: "connections",
  mode: "view",
  surface: "vault",
  flags: ["connections-editable"],
  availableActions: ["status-tab", "connections-tab"],
});

const guide = {
  type: "openPanel",
  panel: "status-tab",
  label: "Open the Status tab",
  then: {
    type: "highlight",
    target: "add-connection-button",
    label: "Add connection",
  },
} as const;

describe("action allow-list", () => {
  it("has exactly the five safe types and nothing that can change vault content", () => {
    expect([...ACTION_TYPES].sort()).toEqual(
      [
        "highlight",
        "navigate",
        "openGenerator",
        "openHelp",
        "openPanel",
      ].sort(),
    );
    for (const type of ACTION_TYPES) {
      expect(type).not.toMatch(
        /create|edit|update|delete|import|export|publish|save/i,
      );
    }
  });
});

describe("validateAction", () => {
  it("accepts open-Status-then-highlight-Add from the Connections tab", () => {
    expect(validateAction(guide, connectionsScreen, deps)).toEqual(guide);
  });

  it("discards an unknown action type", () => {
    expect(
      validateAction(
        { type: "deleteEntity", label: "x" },
        connectionsScreen,
        deps,
      ),
    ).toBeNull();
  });

  it("discards a highlight whose control is neither on screen nor opened by the previous step", () => {
    expect(
      validateAction(
        { type: "highlight", target: "add-connection-button", label: "Add" },
        connectionsScreen,
        deps,
      ),
    ).toBeNull();
  });

  it("discards the guide in a read-only vault where the Add button does not exist", () => {
    const readOnly = sanitizeHelpContext({ ...connectionsScreen, flags: [] });
    expect(validateAction(guide, readOnly, deps)).toBeNull();
  });

  it("discards a highlight for a control in a different area", () => {
    const graphScreen = sanitizeHelpContext({
      ...connectionsScreen,
      area: "graph",
    });
    expect(validateAction(guide, graphScreen, deps)).toBeNull();
  });

  it("discards an openPanel that is not currently available", () => {
    const noTabs = sanitizeHelpContext({
      ...connectionsScreen,
      availableActions: [],
    });
    expect(validateAction(guide, noTabs, deps)).toBeNull();
  });

  it("discards an off-catalogue destination", () => {
    expect(
      validateAction(
        { type: "navigate", to: "admin", label: "Go" },
        connectionsScreen,
        deps,
      ),
    ).toBeNull();
  });

  it("discards a generator when its flag is off and accepts it when on", () => {
    const open = {
      type: "openGenerator",
      generatorId: "campaign",
      label: "Open",
    };
    expect(validateAction(open, connectionsScreen, deps)).toBeNull();
    const withFlag = sanitizeHelpContext({
      ...connectionsScreen,
      flags: ["generators", "connections-editable"],
    });
    expect(validateAction(open, withFlag, deps)).toEqual(open);
  });

  it("discards openHelp for an article that does not exist", () => {
    expect(
      validateAction(
        { type: "openHelp", helpId: "made-up", label: "Help" },
        connectionsScreen,
        deps,
      ),
    ).toBeNull();
    expect(
      validateAction(
        { type: "openHelp", helpId: "graph-basics", label: "Help" },
        connectionsScreen,
        deps,
      ),
    ).not.toBeNull();
  });

  it("rejects a guide with more than one follow-on step", () => {
    const tooLong = {
      ...guide,
      then: {
        ...guide.then,
        then: { type: "openHelp", helpId: "graph-basics", label: "x" },
      },
    };
    expect(validateAction(tooLong, connectionsScreen, deps)).toBeNull();
  });

  it("rejects extra keys such as a selector or script", () => {
    expect(
      validateAction(
        {
          type: "highlight",
          target: "add-connection-button",
          label: "x",
          selector: "body",
        },
        connectionsScreen,
        deps,
      ),
    ).toBeNull();
  });
});

describe("buildActionCandidates", () => {
  const refs: ActionRef[] = [
    { id: "connections.add-guide", action: guide },
    { id: "connections.add-guide", action: guide },
    {
      id: "graph.open",
      action: { type: "navigate", to: "graph", label: "Open the graph" },
    },
    {
      id: "generators.campaign",
      action: { type: "openGenerator", generatorId: "campaign", label: "Open" },
    },
  ];

  it("keeps only valid actions, deduplicated by id", () => {
    const ids = buildActionCandidates(refs, connectionsScreen, deps).map(
      (c) => c.id,
    );
    expect(ids).toEqual(["connections.add-guide", "graph.open"]);
  });

  it("does not offer the connection guide away from the entity screen", () => {
    const graphScreen = sanitizeHelpContext({
      routeTemplate: "/(app)",
      area: "graph",
      availableActions: ["graph"],
    });
    const ids = buildActionCandidates(refs, graphScreen, deps).map((c) => c.id);
    expect(ids).not.toContain("connections.add-guide");
  });
});
