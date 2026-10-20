import { buildHeistPrompt } from "./public-heist";
import type { JsonObject } from "./staged-runtime";

export const RESOLVED_THEFT = buildHeistPrompt({
  genre: "Classic Fantasy",
  heistType: "Theft",
  targetType: "Temple Reliquary",
  targetScale: "Major",
  prize: "Sunstone Chalice",
  campaignContext: "House Valdor's rebellion",
}).resolved;

export const RESOLVED_RESCUE = buildHeistPrompt({
  genre: "Cyberpunk / Corporate",
  heistType: "Rescue",
  targetType: "Corporate Arcology",
  targetScale: "Major",
  prize: "Dr. Catherine Mercer",
}).resolved;

export const VALID_STAGE_1: JsonObject = {
  title: "The Sunstone Chalice Lift",
  summary:
    "Infiltrate the Temple Reliquary and retrieve the Sunstone Chalice before dawn prayer.",
  score:
    "Steal the Sunstone Chalice from beneath the Temple Reliquary before the bells toll dawn. House Valdor will pay handsomely for its recovery.",
  objective:
    "The Sunstone Chalice sits inside a consecrated alcove on the high altar floor. It is shielded by a sacred glass ward that only responds to an anointed deacon's blessing.\n- **The catch**: Fragile — three hard impacts will crack the sacred crystal.\n- **Pressure**: Each time it is run with, dropped, or struck, advance a three-step damage clock.",
  casing: [
    {
      label: "Entry vector",
      detail:
        "A service tunnel under the south cloister is unlocked during the midnight candle replacement shift.",
    },
    {
      label: "Known obstacle",
      detail:
        "The inner cloister gates are locked and guarded by two veteran Templars whose patrol rotates hourly.",
    },
    {
      label: "The objective",
      detail:
        "The Sunstone Chalice rests upon an elevated dais, illuminated by eternal sacred oil lamps.",
    },
  ],
};

export const VALID_STAGE_2: JsonObject = {
  hiddenFactor:
    "The midnight candle attendant is actually an undercover inquisitor watching for thieves, visible by their prayer beads.",
  rings: {
    perimeter:
      "Templar sentries patrol the cloister courtyard. Pass by timing their lantern sweep, by wearing pilgrim vestments, or by scaling the shadowed buttress wall.",
    access:
      "A locked oak portcullis bars access to the high altar hall. Pass by picking the lever lock, by presenting stolen deacon keys, or by crawling through the service heating ducts.",
    inner:
      "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, by quietly lifting the brass hinges, or by dispelling the glass seal with alchemical acid.",
  },
};

export const VALID_STAGE_3: JsonObject = {
  quickReference: [
    "- **Objective**: Steal the Sunstone Chalice from the Temple Reliquary.",
    "- **Primary obstacle**: Patrols, a locked portcullis, and an altar cage.",
    "- **Hidden factor**: The midnight attendant is an undercover inquisitor.",
    "- **Point of no return**: Lifting the chalice arms the glass ward.",
    "- **Pressure**: Three strikes crack the fragile chalice.",
    "- **Default complication**: Templar reinforcements arrive early (default).",
    "- **Escape problem**: The cloister service tunnel seals five minutes after the bells sound.",
  ].join("\n"),
  alarmTrack: [
    { level: 0, label: "Quiet", detail: "Routine prayers and silent patrols." },
    {
      level: 1,
      label: "Suspicion",
      detail: "A templar notices an unlatched gate and doubles back.",
    },
    {
      level: 2,
      label: "Alert",
      detail: "Bells begin tolling and cloister gates are barred.",
    },
    {
      level: 3,
      label: "Lockdown",
      detail: "Heavy iron grates drop over courtyard arches.",
    },
    {
      level: 4,
      label: "Lethal Response",
      detail:
        "The Grand Inquisitor mobilises the elite templar strike squads to hunt the intruders.",
    },
  ],
  complications: [
    {
      label: "Early Bells (default)",
      detail: "The dawn prayer starts fifteen minutes earlier than scheduled.",
    },
    {
      label: "Rival Syndicate",
      detail: "A rival thief team is already working on the south gate.",
    },
    {
      label: "Holy Oil Spill",
      detail: "An overturned lantern sets the vestry curtains ablaze.",
    },
  ],
  moment:
    "Once the chalice is lifted from the altar dais, the ward dispels. A deacon checks the altar twenty minutes later.",
  getaway:
    "The south cloister tunnel remains open until the alarm bells toll. Otherwise, escape via the west bell tower ropes or blend into the crowd of early morning pilgrims.\n**Pursuit**: Templar horsemen follow along the river road if the alarm sounds before the crew crosses the bridge.",
  flashbacks: [
    "A bribed monk who left a side window unfastened.",
    "Forged deacon robes tailored for the heist.",
    "A sleep draught slipped into the kennel master's wine.",
    "A copy of the templar patrol schedule acquired last week.",
  ],
};
