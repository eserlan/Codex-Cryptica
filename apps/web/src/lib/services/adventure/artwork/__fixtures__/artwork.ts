/** Synthetic Vault image sources for artwork integration tests. */
export const artworkFixtures = {
  canonical: { entityId: "location-harbour", image: "images/harbour.webp" },
  local: { placeId: "place-harbour", name: "Harbour" },
  missing: { entityId: "location-missing", image: "images/missing.webp" },
  sameNamePeople: [
    { id: "person-one", name: "Morgan" },
    { id: "person-two", name: "Morgan" },
  ],
  hidden: { id: "person-hidden", visibility: "gm-only" },
  corruptBytes: new Uint8Array([0, 1, 2, 3]),
} as const;
