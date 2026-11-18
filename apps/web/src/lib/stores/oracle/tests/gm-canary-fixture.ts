import {
  AdventureJsonV1Schema,
  type AdventureJsonV1,
} from "@codex/adventure-engine";
import { referencePackage } from "./adventure-fixtures";

export interface Canary {
  type: string;
  token: string;
  recordId: string;
  field: string;
}

const canary = (
  type: string,
  hex: string,
  recordId: string,
  field: string,
) => ({
  type,
  token: `GMCANARY-${type.toUpperCase()}-${hex}`,
  recordId,
  field,
});

export const canaries: readonly Canary[] = [
  canary("location", "1a2b", "canary-location", "name"),
  canary("actor", "3c4d", "canary-actor", "name"),
  canary("faction", "5e6f", "canary-faction", "name"),
  canary("scene", "7a8b", "canary-scene", "title"),
  canary("encounter", "9c0d", "canary-encounter", "title"),
  canary("clue", "1e2f", "canary-clue", "text"),
  canary("reveals", "3a4b", "canary-reveal-clue", "reveals"),
  canary("rumour", "5c6d", "canary-rumour", "text"),
  canary("item", "7e8f", "canary-item", "name"),
  canary("secret", "9a0b", "canary-secret", "text"),
  canary("branch", "2c3d", "canary-scene", "branches[0].description"),
  canary(
    "solution",
    "4e5f",
    "canary-encounter",
    "alternativeSolutions[0].description",
  ),
  canary("connection", "6a7b", "canary-location", "connections[0].description"),
];

const token = (type: string) => canaries.find((c) => c.type === type)!.token;
const hidden = { visibility: "gm-only", epistemicStatus: "explicit" } as const;
const visible = {
  visibility: "player-visible",
  epistemicStatus: "explicit",
} as const;

/** The reference one-shot plus one GM-only record per guarded type. Shipped JSON stays unchanged. */
export const canaryReferencePackage: AdventureJsonV1 =
  AdventureJsonV1Schema.parse({
    ...structuredClone(referencePackage),
    locations: [
      ...referencePackage.locations,
      {
        id: "canary-location",
        name: token("location"),
        summary: "",
        connections: [
          {
            targetLocationId: referencePackage.locations[0]!.id,
            description: token("connection"),
          },
        ],
        ...hidden,
      },
    ],
    actors: [
      ...referencePackage.actors,
      { id: "canary-actor", name: token("actor"), summary: "", ...hidden },
    ],
    factions: [
      ...referencePackage.factions,
      { id: "canary-faction", name: token("faction"), summary: "", ...hidden },
    ],
    // Appended last so the entry scene is unchanged. No branch targets it, so
    // it is "ambiguous", which the validator exempts from reachability.
    scenes: [
      ...referencePackage.scenes,
      {
        id: "canary-scene",
        title: token("scene"),
        summary: "",
        branches: [
          {
            targetSceneId: "ros-scene-2-yard",
            description: token("branch"),
          },
        ],
        ...hidden,
        epistemicStatus: "ambiguous",
      },
    ],
    encounters: [
      ...referencePackage.encounters,
      {
        id: "canary-encounter",
        title: token("encounter"),
        description: "",
        alternativeSolutions: [
          { method: "Slip past", description: token("solution") },
        ],
        ...hidden,
      },
    ],
    clues: [
      ...referencePackage.clues,
      { id: "canary-clue", text: token("clue"), ...hidden },
      {
        id: "canary-reveal-clue",
        text: "A scratch marks the lintel.",
        reveals: token("reveals"),
        ...visible,
      },
    ],
    rumours: [
      ...referencePackage.rumours,
      {
        id: "canary-rumour",
        text: token("rumour"),
        truth: "false",
        ...hidden,
      },
    ],
    items: [
      ...referencePackage.items,
      { id: "canary-item", name: token("item"), summary: "", ...hidden },
    ],
    secrets: [
      ...referencePackage.secrets,
      { id: "canary-secret", text: token("secret"), ...hidden },
    ],
  });

/** The secret text the playthrough writes into session hidden state. */
export const canarySecretText = token("secret");
