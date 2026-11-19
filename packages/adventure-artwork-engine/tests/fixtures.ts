/** Synthetic identities and cues shared by artwork tests; no campaign data. */
export const visiblePlace = {
  id: "place-harbour",
  name: "Harbour",
  cues: ["coast"],
} as const;
export const hiddenPerson = {
  id: "person-hidden",
  visibility: "gm-only",
} as const;
export const sameNamePeople = [
  { id: "person-first", name: "Morgan" },
  { id: "person-second", name: "Morgan" },
] as const;
export const canonicalImage = {
  entityId: "entity-harbour",
  path: "images/harbour.webp",
} as const;
export const corruptImageBytes = new Uint8Array([0, 1, 2, 3]);
