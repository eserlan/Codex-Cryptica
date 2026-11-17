import type { AdventureJsonV1 } from "../src/adventure-json";
import type { ReferenceOneShotKey } from "./reference-one-shot-key";

// Container headings with no content of their own; their child sections are checked.
const CONTAINER_SECTIONS = new Set(["ros-cast", "ros-ending"]);

type Rec = Record<string, unknown> & { id?: string };

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

export function auditReferenceCoverage(
  pkg: AdventureJsonV1,
  key: ReferenceOneShotKey,
): { covered: string[]; missing: string[] } {
  const covered: string[] = [];
  const missing: string[] = [];
  const check = (name: string, ok: boolean) =>
    (ok ? covered : missing).push(name);

  const collections = [
    pkg.locations,
    pkg.actors,
    pkg.factions,
    pkg.scenes,
    pkg.encounters,
    pkg.clues,
    pkg.rumours,
    pkg.items,
    pkg.secrets,
    pkg.endings,
  ] as Rec[][];
  const records = collections.flat();
  const anchorOf = (r: Rec | undefined) =>
    (r?.sourceRef as { anchor?: string } | undefined)?.anchor;
  const byId = (id: string | undefined) => records.find((r) => r.id === id);

  for (const section of key.sections) {
    if (CONTAINER_SECTIONS.has(section.sourceId)) continue;
    check(
      `section:${section.sourceId}`,
      records.some((r) => anchorOf(r) === section.sourceId),
    );
  }

  for (const npc of key.npcs) {
    check(
      `npc:${npc.name}`,
      pkg.actors.some((a) => a.name === npc.name),
    );
  }

  const filedPin = key.secrets.find((s) => s.id === "secret-filed-pin");
  const tobiahKey = key.npcs.find((n) => n.sourceId === "ros-npc-tobiah");
  const tobiah = pkg.actors.find((a) => anchorOf(a) === tobiahKey?.sourceId);
  const gmSecretOk = pkg.secrets.some(
    (s) =>
      s.visibility === "gm-only" &&
      !!filedPin &&
      s.text.includes(filedPin.text) &&
      !!tobiah &&
      (s.relatedEntityIds ?? []).includes(tobiah.id),
  );
  const leaks = (r: unknown) =>
    !!tobiahKey &&
    collectStrings(r).some((str) => str.includes(tobiahKey.motivation));
  const visibleRecords = records.filter(
    (r) => r.visibility === "player-visible",
  );
  const leaked =
    visibleRecords.some(leaks) ||
    [pkg.title, pkg.description, pkg.premise].some(leaks);
  check("hidden-motive", gmSecretOk && !leaked);

  const { missableClue, branch, alternativeSolution } = key;
  check(
    "missable-clue",
    pkg.clues.some(
      (c) =>
        anchorOf(byId(c.placedSceneId)) === missableClue.primarySourceId &&
        anchorOf(byId(c.alternativeSourceId)) ===
          missableClue.alternativeSourceId,
    ),
  );

  const branchScene = pkg.scenes.find((s) => anchorOf(s) === branch.sourceId);
  check(
    "optional-branch",
    !!branchScene &&
      branchScene.optional === true &&
      pkg.scenes.some(
        (s) =>
          s.id !== branchScene.id &&
          (s.branches ?? []).some((b) => b.targetSceneId === branchScene.id),
      ),
  );

  check(
    "alternative-solution",
    pkg.encounters.some(
      (e) =>
        anchorOf(e) === alternativeSolution.obstacleSourceId &&
        e.alternativeSolutions.some((a) => a.socialBypassOfCombat === true),
    ),
  );

  for (const ending of key.endings) {
    check(
      `ending:${ending.id}`,
      pkg.endings.some(
        (e) => e.id === ending.id && anchorOf(e) === ending.sourceId,
      ),
    );
  }

  return { covered, missing };
}
