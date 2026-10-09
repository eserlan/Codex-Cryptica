/** Who can reach a control: anyone on the map, anyone but a player, or the GM in GM view. */
type Who = "anyone" | "host" | "gm";
/** What must be on first: nothing, VTT mode, or Combat mode. */
type Needs = "nothing" | "vtt" | "combat" | "solo";

/**
 * The VTT panels and controls a guide may open or point at, and who can reach
 * each. A control inside the sidebar or the controls bar counts even while that
 * is folded away, because opening it is part of the guide.
 */
const REACHABLE: ReadonlyArray<readonly [string, Who, Needs]> = [
  ["vtt-sidebar", "anyone", "vtt"],
  ["vtt-map-controls", "host", "nothing"],
  ["vtt-grid-settings", "gm", "nothing"],
  ["vtt-encounters", "host", "vtt"],
  ["vtt-mode-toggle", "gm", "nothing"],
  ["vtt-mode-switch", "host", "vtt"],
  ["vtt-add-token", "host", "vtt"],
  ["vtt-grid-button", "gm", "nothing"],
  ["vtt-fog-toggle", "gm", "nothing"],
  ["vtt-solo-fog-toggle", "gm", "nothing"],
  ["vtt-travel-readout", "gm", "solo"],
  ["vtt-layer-control", "gm", "nothing"],
  ["vtt-player-view-toggle", "host", "nothing"],
  ["vtt-ruler-toggle", "host", "vtt"],
  ["vtt-encounters-button", "host", "vtt"],
  ["vtt-tile-decks", "host", "vtt"],
  ["vtt-initiative-panel", "anyone", "combat"],
  ["vtt-share-button", "host", "vtt"],
];

export interface VttReach {
  /** The user is a player in someone else's session. */
  guest: boolean;
  /** The user is the GM and Player View is off. */
  gm: boolean;
  vttOn: boolean;
  combat: boolean;
  soloFog?: boolean;
}

/**
 * A player is never offered a host tool, and nothing is offered in Player
 * View, where the GM controls are switched off.
 */
export function reachableVttActions(reach: VttReach): string[] {
  const allowed: Record<Who, boolean> = {
    anyone: true,
    host: !reach.guest,
    gm: reach.gm,
  };
  const ready: Record<Needs, boolean> = {
    nothing: true,
    vtt: reach.vttOn,
    combat: reach.vttOn && reach.combat,
    solo: reach.gm && reach.soloFog === true,
  };
  return REACHABLE.filter(([, who, needs]) => allowed[who] && ready[needs]).map(
    ([id]) => id,
  );
}
