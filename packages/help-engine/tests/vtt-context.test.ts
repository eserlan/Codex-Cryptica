import { describe, expect, it } from "vitest";
import {
  HELP_CONTEXT_KEYS,
  buildHelpPrompt,
  describeVttSituation,
  parseHelpContext,
  sanitizeHelpContext,
  vttFlagsFor,
  withoutPanelFlags,
  type VttHelpFacts,
} from "../src";

const base: VttHelpFacts = {
  vttOn: true,
  combat: false,
  guest: false,
  playerView: false,
  grid: "none",
  fogOn: false,
  soloFog: false,
  tokenSelected: false,
  tokenLinked: false,
  tokenManageable: false,
  layer: "token",
  hasInitiative: false,
  canAdvanceTurn: false,
  hosting: false,
  measuring: false,
};

const facts = (over: Partial<VttHelpFacts> = {}): VttHelpFacts => ({
  ...base,
  ...over,
});

const mapContext = (flags: string[]) =>
  sanitizeHelpContext({ routeTemplate: "/(app)/map", area: "map", flags });

describe("vttFlagsFor", () => {
  it("describes a GM running combat with a selected, linked token", () => {
    const flags = vttFlagsFor(
      facts({
        combat: true,
        grid: "hex",
        fogOn: true,
        soloFog: false,
        tokenSelected: true,
        tokenLinked: true,
        tokenManageable: true,
        layer: "object",
        hasInitiative: true,
        canAdvanceTurn: true,
        hosting: true,
      }),
    );

    expect(flags).toEqual([
      "vtt-grid-hex",
      "vtt-fog-on",
      "vtt-on",
      "vtt-combat",
      "vtt-token-selected",
      "vtt-token-linked",
      "vtt-token-manageable",
      "vtt-layer-furniture",
      "vtt-has-initiative",
      "vtt-can-advance-turn",
      "vtt-hosting",
    ]);
  });

  it("describes a player who can see a token but not move it, with no GM-only facts", () => {
    const flags = vttFlagsFor(
      facts({
        guest: true,
        layer: null,
        tokenSelected: true,
        tokenLinked: false,
        tokenManageable: false,
      }),
    );

    expect(flags).toContain("vtt-guest");
    expect(flags).toContain("vtt-token-selected");
    expect(flags).not.toContain("vtt-token-manageable");
    expect(flags).not.toContain("vtt-token-linked");
    expect(flags).not.toContain("vtt-hosting");
    expect(flags.some((flag) => flag.startsWith("vtt-layer-"))).toBe(false);
  });

  it("reports no token facts when nothing is selected", () => {
    const flags = vttFlagsFor(
      facts({ tokenLinked: true, tokenManageable: true }),
    );

    expect(flags).not.toContain("vtt-token-selected");
    expect(flags).not.toContain("vtt-token-linked");
    expect(flags).not.toContain("vtt-token-manageable");
  });

  it("reports only the grid, fog and ruler while VTT is off", () => {
    const flags = vttFlagsFor(
      facts({
        vttOn: false,
        combat: true,
        grid: "square",
        fogOn: true,
        soloFog: false,
        measuring: true,
        tokenSelected: true,
        hosting: true,
      }),
    );

    expect(flags).toEqual(["vtt-grid-square", "vtt-fog-on", "vtt-measuring"]);
  });

  it("reports solo fog only while fog is on", () => {
    expect(vttFlagsFor(facts({ fogOn: true, soloFog: true }))).toContain(
      "vtt-solo-fog",
    );
    expect(vttFlagsFor(facts({ fogOn: false, soloFog: true }))).not.toContain(
      "vtt-solo-fog",
    );
    expect(vttFlagsFor(facts({ fogOn: true, soloFog: false }))).not.toContain(
      "vtt-solo-fog",
    );
  });

  it("tells a previewing GM apart from a player", () => {
    expect(vttFlagsFor(facts({ playerView: true }))).toContain(
      "vtt-player-view",
    );
    expect(vttFlagsFor(facts({ playerView: true }))).not.toContain("vtt-guest");
  });
});

describe("the screen description with VTT flags", () => {
  it("accepts every VTT fact at once, and still rejects an unknown flag", () => {
    const all = vttFlagsFor(
      facts({
        combat: true,
        grid: "hex",
        fogOn: true,
        soloFog: false,
        measuring: true,
        tokenSelected: true,
        tokenLinked: true,
        tokenManageable: true,
        hasInitiative: true,
        canAdvanceTurn: true,
        hosting: true,
        playerView: true,
        guest: true,
      }),
    );
    const ctx = mapContext(["explorer-open", "shelf-open", ...all]);

    expect(parseHelpContext(ctx).ok).toBe(true);
    expect(
      parseHelpContext({ ...ctx, flags: [...ctx.flags, "vtt-secret-room"] }).ok,
    ).toBe(false);
    expect(mapContext(["vtt-on", "vtt-secret-room"]).flags).toEqual(["vtt-on"]);
  });

  it("adds no field to the screen description", () => {
    expect(HELP_CONTEXT_KEYS).toEqual(
      [
        "v",
        "routeTemplate",
        "area",
        "entityKind",
        "tab",
        "mode",
        "surface",
        "flags",
        "availableActions",
      ].sort(),
    );
  });

  it("drops the VTT facts when retrying against a service that does not know them", () => {
    const ctx = mapContext([
      "explorer-open",
      "vtt-on",
      "vtt-combat",
      "generators",
    ]);

    expect(withoutPanelFlags(ctx).flags).toEqual(["generators"]);
  });
});

describe("describeVttSituation", () => {
  it("tells a GM in combat what they can do", () => {
    const lines = describeVttSituation(
      vttFlagsFor(
        facts({
          combat: true,
          grid: "hex",
          fogOn: true,
          soloFog: false,
          tokenSelected: true,
          tokenManageable: true,
          hasInitiative: true,
          canAdvanceTurn: true,
        }),
      ),
    );

    expect(lines).toContain("the user is the GM");
    expect(lines).toContain("Combat mode");
    expect(lines).toContain("a hex grid is shown");
    expect(lines).toContain(
      "a token is selected, it is not linked to an entity, the user can move it",
    );
    expect(lines).toContain("the user can press Next Turn");
  });

  it("tells a player what they cannot do", () => {
    const lines = describeVttSituation(
      vttFlagsFor(
        facts({
          guest: true,
          combat: true,
          layer: null,
          tokenSelected: true,
          hasInitiative: true,
        }),
      ),
    );

    expect(lines).toContain("the user is a player in someone else's session");
    expect(lines.join("; ")).toContain("the user cannot move it");
    expect(lines).toContain("the user cannot press Next Turn");
    expect(lines.join(" ")).not.toMatch(/editing the/);
  });

  it("tells the model when fog is solid for solo play", () => {
    const lines = describeVttSituation(
      vttFlagsFor(facts({ fogOn: true, soloFog: true })),
    );

    expect(lines).toContain(
      "fog is on and drawn solid, as players see it (solo play)",
    );
  });

  it("says plainly when nothing is selected or VTT is off", () => {
    expect(describeVttSituation(vttFlagsFor(facts()))).toContain(
      "no token is selected",
    );
    expect(
      describeVttSituation(vttFlagsFor(facts({ vttOn: false }))),
    ).toContain("VTT mode is off");
  });
});

describe("the help prompt", () => {
  const prompt = (ctx: ReturnType<typeof mapContext>) =>
    buildHelpPrompt({
      question: "Why can't I move this?",
      history: [],
      context: ctx,
      chunks: [],
      candidates: [],
    })[1].content;

  it("carries the map situation as a closed set of phrases", () => {
    const text = prompt(
      mapContext(vttFlagsFor(facts({ tokenSelected: true, guest: true }))),
    );

    expect(text).toContain("situation: the user is a player");
    expect(text).toContain("the user cannot move it");
  });

  it("leaves the situation out of every other screen", () => {
    const ctx = sanitizeHelpContext({
      routeTemplate: "/(app)/tables",
      area: "tables",
      flags: ["vtt-on", "vtt-combat"],
    });

    expect(prompt(ctx)).not.toContain("situation:");
  });
});
