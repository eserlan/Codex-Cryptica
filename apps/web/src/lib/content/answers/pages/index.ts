import { AnswerConfigSchema, type AnswerConfig } from "../schema";
import { whatIsAPointCrawl } from "./what-is-a-point-crawl";
import { howDoYouOrganiseRpgCampaignNotes } from "./how-do-you-organise-rpg-campaign-notes";
import { howDoYouCreateAFantasyFaction } from "./how-do-you-create-a-fantasy-faction";
import { howDoYouOrganiseNpcRelationships } from "./how-do-you-organise-npc-relationships";
import { whatMakesAGoodRandomEncounter } from "./what-makes-a-good-random-encounter";
import { howDoYouCreateAPantheon } from "./how-do-you-create-a-pantheon";
import { howDoYouDesignRpgPuzzlesThatDoNotStallTheGame } from "./how-do-you-design-rpg-puzzles-that-do-not-stall-the-game";
import { whatShouldAnRpgSettlementContain } from "./what-should-an-rpg-settlement-contain";
import { howDoYouCreateABelievableFictionalReligion } from "./how-do-you-create-a-believable-fictional-religion";
import { howDoYouRunAConspiracyCampaign } from "./how-do-you-run-a-conspiracy-campaign";
import { howMuchPrepDoYouNeedForAnRpgSession } from "./how-much-prep-do-you-need-for-an-rpg-session";
import { howDoIRunASuccessfulSessionZero } from "./how-do-i-run-a-successful-session-0";

/**
 * The published answer library.
 *
 * Hand-curated on purpose. An answer is added because a distinct question is
 * worth a page of its own — never generated from a keyword list, and never
 * split into synonym or word-order variants of an answer that already exists.
 * See the anti-thin-content rules in #2563 before adding one.
 *
 * Parsing here rather than at each call site means an invalid answer fails at
 * module load — and therefore at build time, since these pages prerender.
 */
export const answers: Record<string, AnswerConfig> = Object.fromEntries(
  [
    whatIsAPointCrawl,
    howDoYouOrganiseRpgCampaignNotes,
    howDoYouCreateAFantasyFaction,
    howDoYouOrganiseNpcRelationships,
    whatMakesAGoodRandomEncounter,
    howDoYouCreateAPantheon,
    howDoYouDesignRpgPuzzlesThatDoNotStallTheGame,
    whatShouldAnRpgSettlementContain,
    howDoYouCreateABelievableFictionalReligion,
    howDoYouRunAConspiracyCampaign,
    howMuchPrepDoYouNeedForAnRpgSession,
    howDoIRunASuccessfulSessionZero,
  ]
    .map((answer) => AnswerConfigSchema.parse(answer))
    .map((answer) => [answer.slug, answer]),
);
