import type { EntityLike, MentionSource } from "../src/types";

export const elara: EntityLike = {
  id: "e-elara",
  title: "Elara Voss",
  type: "character",
  aliases: ["Archmage"],
  summary: "Grand Archmage of the Royal Academy.",
};

export const academy: EntityLike = {
  id: "e-academy",
  title: "Royal Academy of Pagen",
  type: "location",
  content: "A school of magic.\nFounded long ago.",
};

export const elenaOne: EntityLike = {
  id: "e-elena-1",
  title: "Elena",
  type: "character",
  summary: "A ferry captain.",
};

export const elenaTwo: EntityLike = {
  id: "e-elena-2",
  title: "Elena",
  type: "location",
  summary: "A village by the river.",
};

export const hiddenSpy: EntityLike = {
  id: "e-spy",
  title: "Shadow Spy",
  type: "character",
  labels: ["hidden"],
};

/** Builds a MentionSource over the given entities. `isVisible` is the test double for the Vault rules. */
export function makeSource(
  entities: EntityLike[],
  hiddenIds: string[] = [],
): MentionSource {
  const byId = new Map(entities.map((e) => [e.id, e]));
  return {
    getEntity: (id) => byId.get(id),
    isVisible: (entity) =>
      !hiddenIds.includes(entity.id) &&
      !(entity.labels ?? []).includes("hidden"),
    listCandidates: () => entities,
  };
}
