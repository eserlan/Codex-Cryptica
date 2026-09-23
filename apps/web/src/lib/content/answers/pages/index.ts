import { AnswerConfigSchema, type AnswerConfig } from "../schema";
import { canYouPlayATabletopRpgIn30MinuteSessions } from "./can-you-play-a-tabletop-rpg-in-30-minute-sessions";
import { howDoIBalanceRpgCombatEncountersWithoutATpk } from "./how-do-i-balance-rpg-combat-encounters-without-a-tpk";
import { howDoIExpandASimpleRpgCampaignIdea } from "./how-do-i-expand-a-simple-rpg-campaign-idea";
import { howDoIFindATabletopRpgGroupToPlayWith } from "./how-do-i-find-a-tabletop-rpg-group-to-play-with";
import { howDoIGetMyRpgPartyToWorkTogether } from "./how-do-i-get-my-rpg-party-to-work-together";
import { howDoIGetPlayersToEngageWithMyCampaignWorld } from "./how-do-i-get-players-to-engage-with-my-campaign-world";
import { howDoIGiveSpecialistCharactersSpotlight } from "./how-do-i-give-specialist-characters-spotlight";
import { howDoIOrganiseGmNotesForInPersonPlay } from "./how-do-i-organise-gm-notes-for-in-person-play";
import { howDoIRunAJournalistOrMediaCharacterInAnRpg } from "./how-do-i-run-a-journalist-or-media-character-in-an-rpg";
import { howDoIRunASuccessfulSessionZero } from "./how-do-i-run-a-successful-session-0";
import { howDoIRunHackersOrNetrunnersWithoutSplittingTheParty } from "./how-do-i-run-hackers-or-netrunners-without-splitting-the-party";
import { howDoIRunPoliticalIntrigueAndFactionPlay } from "./how-do-i-run-political-intrigue-and-faction-play";
import { howDoIRunSpiesAndInfiltratorsInAnRpg } from "./how-do-i-run-spies-and-infiltrators-in-an-rpg";
import { howDoIStartGmingForTheFirstTime } from "./how-do-i-start-gming-for-the-first-time";
import { howDoITurnAnRpgIdeaIntoAnAdventure } from "./how-do-i-turn-an-rpg-idea-into-an-adventure";
import { howDoYouBuildAPointCrawlForAnRpg } from "./how-do-you-build-a-point-crawl-for-an-rpg";
import { howDoYouCreateABelievableFictionalReligion } from "./how-do-you-create-a-believable-fictional-religion";
import { howDoYouCreateAFantasyCityThatFeelsAlive } from "./how-do-you-create-a-fantasy-city-that-feels-alive";
import { howDoYouCreateAFantasyFaction } from "./how-do-you-create-a-fantasy-faction";
import { howDoYouCreateAFictionalLanguageForAnRpg } from "./how-do-you-create-a-fictional-language-for-an-rpg";
import { howDoYouCreateAMagicSystem } from "./how-do-you-create-a-magic-system";
import { howDoYouCreateAPantheon } from "./how-do-you-create-a-pantheon";
import { howDoYouCreateASecretSocietyForAnRpgCampaign } from "./how-do-you-create-a-secret-society-for-an-rpg-campaign";
import { howDoYouCreateQuestHooksWithoutRailroading } from "./how-do-you-create-quest-hooks-without-railroading";
import { howDoYouDesignRpgPuzzlesThatDoNotStallTheGame } from "./how-do-you-design-rpg-puzzles-that-do-not-stall-the-game";
import { howDoYouGenerateUsefulRpgRumours } from "./how-do-you-generate-useful-rpg-rumours";
import { howDoYouGiveHintsForAnRpgPuzzleWithoutGivingAwayTheAnswer } from "./how-do-you-give-hints-for-an-rpg-puzzle-without-giving-away-the-answer";
import { howDoYouHandleCharacterDeathInATabletopRpg } from "./how-do-you-handle-character-death-in-a-tabletop-rpg";
import { howDoYouHandlePlayersGoingOffScriptAsAGm } from "./how-do-you-handle-players-going-off-script-as-a-gm";
import { howDoYouHelpPlayersRememberWhatHappenedInATtrpgCampaign } from "./how-do-you-help-players-remember-what-happened-in-a-ttrpg-campaign";
import { howDoYouImproviseNpcsOnTheSpot } from "./how-do-you-improvise-npcs-on-the-spot";
import { howDoYouKeepTrackOfNpcsInALongCampaign } from "./how-do-you-keep-track-of-npcs-in-a-long-campaign";
import { howDoYouKeepTrackOfTimeInATabletopCampaign } from "./how-do-you-keep-track-of-time-in-a-tabletop-campaign";
import { howDoYouMakeABossFightMemorableInATabletopRpg } from "./how-do-you-make-a-boss-fight-memorable-in-a-tabletop-rpg";
import { howDoYouMakeATabletopRpgSessionMoreEngaging } from "./how-do-you-make-a-tabletop-rpg-session-more-engaging";
import { howDoYouMakeAnAlienSpeciesFeelBelievable } from "./how-do-you-make-an-alien-species-feel-believable";
import { howDoYouMakeNpcsMemorableWithoutLotsOfPrep } from "./how-do-you-make-npcs-memorable-without-lots-of-prep";
import { howDoYouMakeTravelInterestingInATabletopRpg } from "./how-do-you-make-travel-interesting-in-a-tabletop-rpg";
import { howDoYouManageACampaignTimelineInAnRpg } from "./how-do-you-manage-a-campaign-timeline-in-an-rpg";
import { howDoYouOrganiseNpcRelationships } from "./how-do-you-organise-npc-relationships";
import { howDoYouOrganiseRpgCampaignNotes } from "./how-do-you-organise-rpg-campaign-notes";
import { howDoYouPrepAWeeklyRpgSessionQuickly } from "./how-do-you-prep-a-weekly-rpg-session-quickly";
import { howDoYouPrepareASandboxRpgCampaign } from "./how-do-you-prepare-a-sandbox-rpg-campaign";
import { howDoYouRecapATtrpgSession } from "./how-do-you-recap-a-ttrpg-session";
import { howDoYouRunACampaignWhenYouOnlyPlayOnceAMonth } from "./how-do-you-run-a-campaign-when-you-only-play-once-a-month";
import { howDoYouRunAChaseInATabletopRpg } from "./how-do-you-run-a-chase-in-a-tabletop-rpg";
import { howDoYouRunAConspiracyCampaign } from "./how-do-you-run-a-conspiracy-campaign";
import { howDoYouRunAHeistInATabletopRpg } from "./how-do-you-run-a-heist-in-a-tabletop-rpg";
import { howDoYouRunAMysteryWithoutRailroading } from "./how-do-you-run-a-mystery-without-railroading";
import { howDoYouRunASceneWithMultipleNpcs } from "./how-do-you-run-a-scene-with-multiple-npcs";
import { howDoYouRunAnRpgCampaignInOneCity } from "./how-do-you-run-an-rpg-campaign-in-one-city";
import { howDoYouRunCharacterRolesInACyberpunkRpg } from "./how-do-you-run-character-roles-in-a-cyberpunk-rpg";
import { howDoYouRunDndForALargeGroupOfPlayers } from "./how-do-you-run-dnd-for-a-large-group-of-players";
import { howDoYouRunFactionsInASandboxCampaign } from "./how-do-you-run-factions-in-a-sandbox-campaign";
import { howDoYouStartWorldbuildingFromScratch } from "./how-do-you-start-worldbuilding-from-scratch";
import { howDoYouTrackFactionTurnsBetweenRpgSessions } from "./how-do-you-track-faction-turns-between-rpg-sessions";
import { howDoYouTrackUnresolvedPlotHooksInAnRpgCampaign } from "./how-do-you-track-unresolved-plot-hooks-in-an-rpg-campaign";
import { howDoYouUsePlayerBackstoriesInAnRpgCampaignWorld } from "./how-do-you-use-player-backstories-in-an-rpg-campaign-world";
import { howDoYouWriteAOneShotAdventure } from "./how-do-you-write-a-one-shot-adventure";
import { howManyNpcsDoesAnRpgTownNeed } from "./how-many-npcs-does-an-rpg-town-need";
import { howMuchCampaignLoreShouldPlayersBeExpectedToRemember } from "./how-much-campaign-lore-should-players-be-expected-to-remember";
import { howMuchPrepDoYouNeedForAnRpgSession } from "./how-much-prep-do-you-need-for-an-rpg-session";
import { howMuchRuleOfCoolShouldADmAllow } from "./how-much-rule-of-cool-should-a-dm-allow";
import { howToCreateACyberpunkCityDistrict } from "./how-to-create-a-cyberpunk-city-district";
import { howToCreateASciFiStarSystemForAnRpg } from "./how-to-create-a-sci-fi-star-system-for-an-rpg";
import { howToCreateRumoursForAFantasyTown } from "./how-to-create-rumours-for-a-fantasy-town";
import { howToWriteAnInWorldNewspaperForAnRpg } from "./how-to-write-an-in-world-newspaper-for-an-rpg";
import { isMyRpgCampaignIdeaGood } from "./is-my-rpg-campaign-idea-good";
import { pointCrawlVsHexCrawl } from "./point-crawl-vs-hex-crawl";
import { whatIsAPointCrawl } from "./what-is-a-point-crawl";
import { whatKindOfShipShouldAPirateCrewStartWith } from "./what-kind-of-ship-should-a-pirate-crew-start-with";
import { whatKindOfShipShouldASciFiRpgPartyStartWith } from "./what-kind-of-ship-should-a-sci-fi-rpg-party-start-with";
import { whatMakesAGoodHeistTargetInATabletopRpg } from "./what-makes-a-good-heist-target-in-a-tabletop-rpg";
import { whatMakesAGoodRandomEncounter } from "./what-makes-a-good-random-encounter";
import { whatRpgFeelsLikeDndButIsSimpler } from "./what-rpg-feels-like-dnd-but-is-simpler";
import { whatRpgShouldIPlayForAnOverTheTopSpaceOpera } from "./what-rpg-should-i-play-for-an-over-the-top-space-opera";
import { whatRpgShouldIPlayForInvestigativeHorror } from "./what-rpg-should-i-play-for-investigative-horror";
import { whatRpgShouldIUseForTacticalCombat } from "./what-rpg-should-i-use-for-tactical-combat";
import { whatRpgSystemIsGoodForSoloPlay } from "./what-rpg-system-is-good-for-solo-play";
import { whatRpgSystemShouldWeTryInsteadOfDnd } from "./what-rpg-system-should-we-try-instead-of-dnd";
import { whatRpgWorksForPoliticalIntrigueAndFactionPlay } from "./what-rpg-works-for-political-intrigue-and-faction-play";
import { whatShouldANewDndPlayerLearnFirst } from "./what-should-a-new-dnd-player-learn-first";
import { whatShouldAnRpgSettlementContain } from "./what-should-an-rpg-settlement-contain";
import { whatShouldILookForInAnRpgCampaignManager } from "./what-should-i-look-for-in-an-rpg-campaign-manager";
import { whatTtrpgShouldIUseForAFantasyDungeonCrawl } from "./what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl";
import { whereDoIStartIfIHaveNeverPlayedATabletopRpg } from "./where-do-i-start-if-i-have-never-played-a-tabletop-rpg";
import { xpLevelingVsMilestoneLeveling } from "./xp-leveling-vs-milestone-leveling";

/**
 * The published answer library.
 *
 * Auto-generated by scripts/sync-answers.ts. Do not edit directly.
 * To add a new answer, create a file in `pages/<slug>.ts` and run `bun sync:answers`.
 */
export const answers: Record<string, AnswerConfig> = Object.fromEntries(
  [
    canYouPlayATabletopRpgIn30MinuteSessions,
    howDoIBalanceRpgCombatEncountersWithoutATpk,
    howDoIExpandASimpleRpgCampaignIdea,
    howDoIFindATabletopRpgGroupToPlayWith,
    howDoIGetMyRpgPartyToWorkTogether,
    howDoIGetPlayersToEngageWithMyCampaignWorld,
    howDoIGiveSpecialistCharactersSpotlight,
    howDoIOrganiseGmNotesForInPersonPlay,
    howDoIRunAJournalistOrMediaCharacterInAnRpg,
    howDoIRunASuccessfulSessionZero,
    howDoIRunHackersOrNetrunnersWithoutSplittingTheParty,
    howDoIRunPoliticalIntrigueAndFactionPlay,
    howDoIRunSpiesAndInfiltratorsInAnRpg,
    howDoIStartGmingForTheFirstTime,
    howDoITurnAnRpgIdeaIntoAnAdventure,
    howDoYouBuildAPointCrawlForAnRpg,
    howDoYouCreateABelievableFictionalReligion,
    howDoYouCreateAFantasyCityThatFeelsAlive,
    howDoYouCreateAFantasyFaction,
    howDoYouCreateAFictionalLanguageForAnRpg,
    howDoYouCreateAMagicSystem,
    howDoYouCreateAPantheon,
    howDoYouCreateASecretSocietyForAnRpgCampaign,
    howDoYouCreateQuestHooksWithoutRailroading,
    howDoYouDesignRpgPuzzlesThatDoNotStallTheGame,
    howDoYouGenerateUsefulRpgRumours,
    howDoYouGiveHintsForAnRpgPuzzleWithoutGivingAwayTheAnswer,
    howDoYouHandleCharacterDeathInATabletopRpg,
    howDoYouHandlePlayersGoingOffScriptAsAGm,
    howDoYouHelpPlayersRememberWhatHappenedInATtrpgCampaign,
    howDoYouImproviseNpcsOnTheSpot,
    howDoYouKeepTrackOfNpcsInALongCampaign,
    howDoYouKeepTrackOfTimeInATabletopCampaign,
    howDoYouMakeABossFightMemorableInATabletopRpg,
    howDoYouMakeATabletopRpgSessionMoreEngaging,
    howDoYouMakeAnAlienSpeciesFeelBelievable,
    howDoYouMakeNpcsMemorableWithoutLotsOfPrep,
    howDoYouMakeTravelInterestingInATabletopRpg,
    howDoYouManageACampaignTimelineInAnRpg,
    howDoYouOrganiseNpcRelationships,
    howDoYouOrganiseRpgCampaignNotes,
    howDoYouPrepAWeeklyRpgSessionQuickly,
    howDoYouPrepareASandboxRpgCampaign,
    howDoYouRecapATtrpgSession,
    howDoYouRunACampaignWhenYouOnlyPlayOnceAMonth,
    howDoYouRunAChaseInATabletopRpg,
    howDoYouRunAConspiracyCampaign,
    howDoYouRunAHeistInATabletopRpg,
    howDoYouRunAMysteryWithoutRailroading,
    howDoYouRunASceneWithMultipleNpcs,
    howDoYouRunAnRpgCampaignInOneCity,
    howDoYouRunCharacterRolesInACyberpunkRpg,
    howDoYouRunDndForALargeGroupOfPlayers,
    howDoYouRunFactionsInASandboxCampaign,
    howDoYouStartWorldbuildingFromScratch,
    howDoYouTrackFactionTurnsBetweenRpgSessions,
    howDoYouTrackUnresolvedPlotHooksInAnRpgCampaign,
    howDoYouUsePlayerBackstoriesInAnRpgCampaignWorld,
    howDoYouWriteAOneShotAdventure,
    howManyNpcsDoesAnRpgTownNeed,
    howMuchCampaignLoreShouldPlayersBeExpectedToRemember,
    howMuchPrepDoYouNeedForAnRpgSession,
    howMuchRuleOfCoolShouldADmAllow,
    howToCreateACyberpunkCityDistrict,
    howToCreateASciFiStarSystemForAnRpg,
    howToCreateRumoursForAFantasyTown,
    howToWriteAnInWorldNewspaperForAnRpg,
    isMyRpgCampaignIdeaGood,
    pointCrawlVsHexCrawl,
    whatIsAPointCrawl,
    whatKindOfShipShouldAPirateCrewStartWith,
    whatKindOfShipShouldASciFiRpgPartyStartWith,
    whatMakesAGoodHeistTargetInATabletopRpg,
    whatMakesAGoodRandomEncounter,
    whatRpgFeelsLikeDndButIsSimpler,
    whatRpgShouldIPlayForAnOverTheTopSpaceOpera,
    whatRpgShouldIPlayForInvestigativeHorror,
    whatRpgShouldIUseForTacticalCombat,
    whatRpgSystemIsGoodForSoloPlay,
    whatRpgSystemShouldWeTryInsteadOfDnd,
    whatRpgWorksForPoliticalIntrigueAndFactionPlay,
    whatShouldANewDndPlayerLearnFirst,
    whatShouldAnRpgSettlementContain,
    whatShouldILookForInAnRpgCampaignManager,
    whatTtrpgShouldIUseForAFantasyDungeonCrawl,
    whereDoIStartIfIHaveNeverPlayedATabletopRpg,
    xpLevelingVsMilestoneLeveling,
  ]
    .map((answer) => AnswerConfigSchema.parse(answer))
    .map((answer) => [answer.slug, answer]),
);
