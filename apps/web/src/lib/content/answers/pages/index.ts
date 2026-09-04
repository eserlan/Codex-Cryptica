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
import { howDoIBalanceRpgCombatEncountersWithoutATpk } from "./how-do-i-balance-rpg-combat-encounters-without-a-tpk";
import { howDoIGetPlayersToEngageWithMyCampaignWorld } from "./how-do-i-get-players-to-engage-with-my-campaign-world";
import { whatShouldILookForInAnRpgCampaignManager } from "./what-should-i-look-for-in-an-rpg-campaign-manager";
import { whatRpgSystemShouldWeTryInsteadOfDnd } from "./what-rpg-system-should-we-try-instead-of-dnd";
import { whereDoIStartIfIHaveNeverPlayedATabletopRpg } from "./where-do-i-start-if-i-have-never-played-a-tabletop-rpg";
import { howDoIFindATabletopRpgGroupToPlayWith } from "./how-do-i-find-a-tabletop-rpg-group-to-play-with";
import { howDoYouMakeTravelInterestingInATabletopRpg } from "./how-do-you-make-travel-interesting-in-a-tabletop-rpg";

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
    howDoIBalanceRpgCombatEncountersWithoutATpk,
    howDoIGetPlayersToEngageWithMyCampaignWorld,
    whatShouldILookForInAnRpgCampaignManager,
    whatRpgSystemShouldWeTryInsteadOfDnd,
    whereDoIStartIfIHaveNeverPlayedATabletopRpg,
    howDoIFindATabletopRpgGroupToPlayWith,
    howDoYouMakeTravelInterestingInATabletopRpg,
  ]
    .map((answer) => AnswerConfigSchema.parse(answer))
    .map((answer) => [answer.slug, answer]),
);
