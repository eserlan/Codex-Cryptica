import type { VttFlag } from "../actions/catalogue";

/**
 * What the map screen reports about the user's own VTT state. Every field is
 * a plain fact, already limited to what this user is allowed to know: a
 * player's facts say nothing about hidden tokens, hidden terrain or GM-only
 * settings. There is no field for a name, an ID or any text.
 */
export interface VttHelpFacts {
  vttOn: boolean;
  combat: boolean;
  /** The user is a player in someone else's session. */
  guest: boolean;
  /** The GM is previewing the map the way players see it. */
  playerView: boolean;
  grid: "none" | "square" | "hex";
  fogOn: boolean;
  /** The GM has fog drawn solid, as players see it, to play their own map. */
  soloFog: boolean;
  /** A token the user can see is selected. */
  tokenSelected: boolean;
  /** That token is linked to an entity the user can open. */
  tokenLinked: boolean;
  /** The user can move or edit that token. */
  tokenManageable: boolean;
  /** The layer being edited. Only the GM edits layers; players report null. */
  layer: "terrain" | "object" | "token" | null;
  hasInitiative: boolean;
  /** The user can press Next Turn right now. */
  canAdvanceTurn: boolean;
  hosting: boolean;
  measuring: boolean;
}

type Rule = readonly [boolean, VttFlag];

const keep = (rules: readonly Rule[]): VttFlag[] =>
  rules.filter(([on]) => on).map(([, flag]) => flag);

/** What is true however the map is being used. */
function alwaysFlags(facts: VttHelpFacts): VttFlag[] {
  return keep([
    [facts.guest, "vtt-guest"],
    [facts.playerView, "vtt-player-view"],
    [facts.grid === "square", "vtt-grid-square"],
    [facts.grid === "hex", "vtt-grid-hex"],
    [facts.fogOn, "vtt-fog-on"],
    [facts.fogOn && facts.soloFog, "vtt-solo-fog"],
    [facts.measuring, "vtt-measuring"],
  ]);
}

/** What only means something while VTT mode is on. */
function playFlags(facts: VttHelpFacts): VttFlag[] {
  const token = facts.tokenSelected;
  return keep([
    [true, "vtt-on"],
    [facts.combat, "vtt-combat"],
    [token, "vtt-token-selected"],
    [token && facts.tokenLinked, "vtt-token-linked"],
    [token && facts.tokenManageable, "vtt-token-manageable"],
    [facts.layer === "terrain", "vtt-layer-terrain"],
    [facts.layer === "object", "vtt-layer-furniture"],
    [facts.layer === "token", "vtt-layer-tokens"],
    [facts.hasInitiative, "vtt-has-initiative"],
    [facts.canAdvanceTurn, "vtt-can-advance-turn"],
    [facts.hosting, "vtt-hosting"],
  ]);
}

/** The map facts as screen-description flags. Only the grid, fog and ruler are reported while VTT is off. */
export function vttFlagsFor(facts: VttHelpFacts): VttFlag[] {
  return [...alwaysFlags(facts), ...(facts.vttOn ? playFlags(facts) : [])];
}

const either = (on: boolean, yes: string, no: string): string =>
  on ? yes : no;

function tokenPhrase(has: (flag: VttFlag) => boolean): string {
  if (!has("vtt-token-selected")) return "no token is selected";
  return [
    "a token is selected",
    either(
      has("vtt-token-linked"),
      "it is linked to an entity",
      "it is not linked to an entity",
    ),
    either(
      has("vtt-token-manageable"),
      "the user can move it",
      "the user cannot move it",
    ),
  ].join(", ");
}

function layerPhrases(has: (flag: VttFlag) => boolean): string[] {
  return [
    has("vtt-layer-terrain") ? "editing the Terrain layer" : "",
    has("vtt-layer-furniture") ? "editing the Furniture layer" : "",
    has("vtt-layer-tokens") ? "editing the Tokens layer" : "",
  ].filter(Boolean);
}

function combatPhrases(has: (flag: VttFlag) => boolean): string[] {
  if (!has("vtt-combat")) return [];
  return [
    either(
      has("vtt-has-initiative"),
      "the initiative list has combatants",
      "the initiative list is empty",
    ),
    either(
      has("vtt-can-advance-turn"),
      "the user can press Next Turn",
      "the user cannot press Next Turn",
    ),
  ];
}

function gridPhrase(has: (flag: VttFlag) => boolean): string {
  if (has("vtt-grid-hex")) return "a hex grid is shown";
  return either(
    has("vtt-grid-square"),
    "a square grid is shown",
    "no grid is shown",
  );
}

/**
 * The same facts in plain words for the model. A closed vocabulary: only these
 * phrases ever reach the prompt, never anything the user typed.
 */
export function describeVttSituation(flags: readonly string[]): string[] {
  const has = (flag: VttFlag) => flags.includes(flag);
  const on = has("vtt-on");
  return [
    either(
      has("vtt-guest"),
      "the user is a player in someone else's session",
      "the user is the GM",
    ),
    either(on, "VTT mode is on", "VTT mode is off"),
    on ? either(has("vtt-combat"), "Combat mode", "Explore mode") : "",
    has("vtt-player-view")
      ? "the GM is previewing Player View, so GM controls are off"
      : "",
    gridPhrase(has),
    either(
      has("vtt-fog-on"),
      has("vtt-solo-fog")
        ? "fog is on and drawn solid, as players see it (solo play)"
        : "fog is on",
      "fog is off",
    ),
    has("vtt-measuring") ? "the ruler is active" : "",
    ...(on
      ? [
          tokenPhrase(has),
          ...layerPhrases(has),
          ...combatPhrases(has),
          has("vtt-hosting") ? "hosting a live session" : "",
        ]
      : []),
  ].filter(Boolean);
}
