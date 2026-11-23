import type { SuggestedConnection } from "./campaign-generator-types";
import type { GeneratorMechanicsBundle } from "./tov-mechanics-schema";
import type { LanguageProfileV1 } from "schema";
import type { OneShotAdventure } from "./one-shot-types";
import type { PointCrawlNetwork } from "./point-crawl-state";
import type { MysteryGraph } from "./mystery-graph";
import type { StarSystemBody } from "./public-star-system";
import type {
  ConstellationPattern,
  ConstellationInterpretation,
  NightSkyData,
} from "./public-constellation";

/**
 * Structured canonical facts behind a generated tome. The prose is derived
 * from these, so audits and Oracle can check text against facts instead of
 * guessing at them.
 */
export interface TomeCanonicalFacts {
  author: string;
  custodian: string;
  associatedLocation: string;
  /** Exact quantity and unit of lost material (leaves vs gatherings). */
  missingMaterial: string;
  bookClaim: string;
  deception: string;
  objectiveTruth: string;
  actionableClue: string;
  /** The one rule or procedure the whole book turns on, stated once. */
  centralRule: string;
  /** How the artefact was made (handwritten, printed, copied, facsimile). */
  productionMethod: string;
  /** Who introduced the error (author, copyist, translator, glossator, censor). */
  errorSource: string;
}

/** Minimal subset of the SEO GeneratorOutput used by public pages. */
export interface PublicGeneratorOutput {
  type: string;
  /** Vault entity sub-kind (e.g. "language" on notes) for saved drafts. */
  kind?: string;
  title: string;
  summary?: string;
  content: string;
  lore: string;
  labels: string[];
  status: "active" | "draft";
  /** The model was unavailable and the engine fell back to local tables. */
  aiFallback?: boolean;
  /** The AI draft is complete but its editorial review didn't finish. */
  aiReviewSkipped?: boolean;
  /** Parts written from templates because their AI step didn't finish. */
  aiPartialFallback?: string[];
  languageProfile?: LanguageProfileV1;
  languageProfileVersion?: 1;
  /** Structured major-body list for star-system diagrams. */
  bodies?: StarSystemBody[];
  /** Primary star's spectral class/type. */
  starType?: string;
  /** Structured star-pattern data for constellations. */
  pattern?: ConstellationPattern;
  /** Constellation generator's cultural interpretation(s) of `pattern`. */
  interpretations?: ConstellationInterpretation[];
  /** Night-sky mode's full set of constellations for one culture. */
  nightSky?: NightSkyData;
  /** Structured observances for a calendar. */
  observances?: Array<{
    name: string;
    type: string;
    when: string;
    observers: string;
    traditions: string;
    tension: string;
  }>;
  /** Dominant conflict domain for a BBEG villain's plan. */
  conflictDomain?: string;
  /** Optional connections or relationships to other entities. */
  connections?: SuggestedConnection[];
  /** Structured one-shot adventure, kept so scenes can be regenerated. */
  oneShot?: OneShotAdventure;
  /** Structured point-crawl network for regeneration and saving. */
  pointCrawl?: PointCrawlNetwork;
  mysteryGraph?: MysteryGraph;
  /** Structured canonical facts for tomes. */
  tomeFacts?: TomeCanonicalFacts;
  /** Optional rules system id (e.g. "tales-of-the-valiant"). */
  systemId?: string;
  /** Structured game mechanics bundle for supported rules systems. */
  mechanics?: GeneratorMechanicsBundle;
}
