import { defaultRng, pickFrom, type Rng } from "./random-utils";

/** Low-pressure variation cues for public generators that create things or people. */
export type PublicCreativeKind =
  | "character"
  | "place"
  | "object"
  | "names"
  | "event"
  | "creature"
  | "organisation"
  | "language"
  | "world"
  | "sky"
  | "landscape";

const CUES: Record<PublicCreativeKind, readonly string[]> = {
  character: [
    "Look for a distinctive practical skill or habit that affects how they act.",
    "Consider a specific relationship or responsibility that shapes their choices.",
    "Give their outlook a distinctive source in their experience or community.",
    "Consider a useful strength with a context-specific limitation.",
  ],
  place: [
    "Look for a distinctive everyday practice that makes the place feel lived in.",
    "Consider how a local resource or environment shapes daily life.",
    "Give the place a distinctive relationship with a neighbouring community.",
    "Consider a practical local challenge and how inhabitants respond to it.",
  ],
  object: [
    "Look for a distinctive practical use or method of operation.",
    "Consider a material, form or construction detail suited to its purpose.",
    "Consider a meaningful limitation or trade-off in how it is used.",
    "Consider how its history or maker shaped a specific feature.",
  ],
  names: [
    "Vary the rhythm and length of the names within the selected style.",
    "Explore different sounds within the selected naming tradition.",
    "Vary name structures while keeping the requested culture recognisable.",
    "Use a range of openings and endings appropriate to the selected style.",
  ],
  creature: [
    "Consider a distinctive behaviour shaped by its environment.",
    "Consider how it finds food, shelter or safety.",
    "Consider a physical adaptation with a practical limitation.",
    "Consider how it interacts with other creatures or its surroundings.",
  ],
  organisation: [
    "Consider a distinctive practical method the group uses to pursue its goals.",
    "Consider a responsibility that shapes the group's internal choices.",
    "Consider an unusual source of influence or a constraint on its operations.",
    "Consider a relationship with the surrounding community.",
  ],
  language: [
    "Consider how speakers use their language in daily life.",
    "Consider a sound or rhythm compatible with the selected phonology.",
    "Consider a cultural distinction that could shape vocabulary.",
    "Consider a naming convention consistent with the established rules.",
  ],
  landscape: [
    "Consider a distinctive physical feature and how it affects movement or exploration.",
    "Consider how the environment changes over time or in response to visitors.",
    "Consider a distinctive connection between the place's features and its history.",
    "Consider a practical trade-off posed by the place's layout or conditions.",
  ],
  world: [
    "Consider how an environmental feature shapes conditions on this world.",
    "Consider a distinctive relationship between two physical features.",
    "Consider how a long-term change affects the world's environment.",
    "Consider a practical constraint that follows from the world's conditions.",
  ],
  sky: [
    "Consider a distinctive spatial arrangement compatible with the requested design.",
    "Consider how observation or orientation relates to the chosen design.",
    "Consider a meaningful relationship between two features in the sky.",
    "Consider how the selected design could change from a different viewpoint.",
  ],
  event: [
    "Consider a distinctive practical consequence for people involved.",
    "Consider how a relationship or obligation shapes the event.",
    "Look for a distinctive change in circumstances or expectations.",
    "Consider a trade-off arising from what the participants value.",
  ],
};

export function withPublicCreativeCue(
  prompt: string,
  kind: PublicCreativeKind,
  rng: Rng = defaultRng,
): string {
  return `${prompt}\n\nOptional creative variation: ${pickFrom(CUES[kind], rng)} Use this only when it fits the user's chosen settings, instructions, established context and requested output format; those always take precedence.`;
}
