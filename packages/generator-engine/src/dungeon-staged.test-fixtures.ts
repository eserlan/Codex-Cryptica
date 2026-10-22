import { buildDungeonPrompt, type ResolvedDungeon } from "./public-dungeon";

export const OPTIONS = { genre: "Classic Fantasy", scale: "Sprawling" };

export function setup() {
  const { resolved } = buildDungeonPrompt(OPTIONS);
  return resolved;
}

export function foundation(resolved: ResolvedDungeon) {
  return {
    title: "The Glasswrights' Descent",
    summary: "A drowned workshop that still hums.",
    throughline:
      "Glasswrights dug it, the tide broke it, now two crews fight over it.",
    history: "Glasswrights cut the descent to temper glass in the deep heat.",
    currentState: "Contested by two crews.",
    signatureFeature: "A furnace that burns blue without fuel.",
    secret: "The furnace feeds on whoever tends it.",
    sectorBriefs: resolved.sectors.map((s) => ({
      id: s.id,
      brief: `Role of ${s.id}.`,
    })),
  };
}

export function sectors(resolved: ResolvedDungeon) {
  return {
    sectors: resolved.sectors.map((s, i) => ({
      id: s.id,
      name: `Hollow ${i + 1}`,
      description: `Description of hollow ${i + 1}.`,
      stockType: "Trap",
      stockDetail: `Unique brass idol number ${i + 1}`,
    })),
    hazards: ["Scalding steam vents", "A floor that tilts toward the furnace"],
    treasures: ["A glassblower's signet", "A map etched into a brass plate"],
    hooks: ["A guild offers a bounty", "A salvage crew asks for help"],
  };
}

export function faction(
  name: string,
  territory: string[],
  goal = "Cap the steam vents",
) {
  return {
    name,
    identity: "A crew of salvagers.",
    virtue: "Patient",
    vice: "Greedy",
    goal,
    drive: "WRONG",
    obstacle: "Scalding steam vents block the lower hollows.",
    origin: "Came for the glass after the tide.",
    belief: "The furnace can be tamed.",
    territorySectorIds: territory,
    presence: territory.map((id) => ({
      sectorId: id,
      detail: `${name} camp in ${id}.`,
    })),
    strength: "Heat-proof gear.",
    leader: { name: `${name} Lead`, description: "Runs the crew." },
    notable: { name: `${name} Second`, description: "Keeps the books." },
    relationship: "Stalls the rivals while mapping the vents.",
  };
}

export function factions(
  resolved: ResolvedDungeon,
  override: Partial<ReturnType<typeof faction>> = {},
) {
  const [a, b] = [resolved.sectors[0].id, resolved.sectors[1].id];
  return {
    factionSituation: "Lantern Wrights and Weir Wardens both want the furnace.",
    factions: [
      { ...faction("Lantern Wrights", [a]), ...override },
      faction(
        "Weir Wardens",
        [b],
        "Seal the signet away from the Lantern Wrights",
      ),
    ],
  };
}
