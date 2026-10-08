import { AnswerConfigSchema, type AnswerConfig } from "../schema";
import { canMultipleGodsShareADomain } from "./can-multiple-gods-share-a-domain";
import { canYouPlayATabletopRpgIn30MinuteSessions } from "./can-you-play-a-tabletop-rpg-in-30-minute-sessions";
import { howCommonShouldMagicBeInAFantasyWorld } from "./how-common-should-magic-be-in-a-fantasy-world";
import { howDoFantasyCitiesDefendAgainstFlyingCreaturesAndTeleportation } from "./how-do-fantasy-cities-defend-against-flying-creatures-and-teleportation";
import { howDoIBalanceRpgCombatEncountersWithoutATpk } from "./how-do-i-balance-rpg-combat-encounters-without-a-tpk";
import { howDoIBuildABelievableConstitutionalCrisisOrCoup } from "./how-do-i-build-a-believable-constitutional-crisis-or-coup";
import { howDoIBuildABelievableEconomyForAFantasyWorld } from "./how-do-i-build-a-believable-economy-for-a-fantasy-world";
import { howDoICreateInterestingIslandsAndPortsForAPirateCampaign } from "./how-do-i-create-interesting-islands-and-ports-for-a-pirate-campaign";
import { howDoIDecideWhatASettlementProducesImportsAndExports } from "./how-do-i-decide-what-a-settlement-produces-imports-and-exports";
import { howDoIExpandASimpleRpgCampaignIdea } from "./how-do-i-expand-a-simple-rpg-campaign-idea";
import { howDoIFindATabletopRpgGroupToPlayWith } from "./how-do-i-find-a-tabletop-rpg-group-to-play-with";
import { howDoIGetMyRpgPartyToWorkTogether } from "./how-do-i-get-my-rpg-party-to-work-together";
import { howDoIGetPlayersToEngageWithMyCampaignWorld } from "./how-do-i-get-players-to-engage-with-my-campaign-world";
import { howDoIGiveDifferentCivilisationsDistinctStrengthsAndWeaknesses } from "./how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses";
import { howDoIGiveSpecialistCharactersSpotlight } from "./how-do-i-give-specialist-characters-spotlight";
import { howDoIHandleDivinationMagicWithoutLettingOneCharacterSolveEveryMystery } from "./how-do-i-handle-divination-magic-without-letting-one-character-solve-every-mystery";
import { howDoIHandlePlayersAskingAnNpcToTellUsEverythingYouKnow } from "./how-do-i-handle-players-asking-an-npc-to-tell-us-everything-you-know";
import { howDoIImproviseNpcsInDnd } from "./how-do-i-improvise-npcs-in-dnd";
import { howDoIKeepPlayersEngagedDuringOtherPlayersTurnsInCombat } from "./how-do-i-keep-players-engaged-during-other-players-turns-in-combat";
import { howDoIMakeACampaignThreatFeelUrgentWithoutRailroading } from "./how-do-i-make-a-campaign-threat-feel-urgent-without-railroading";
import { howDoIMakeAPlayerBaseMatterInAnRpgCampaign } from "./how-do-i-make-a-player-base-matter-in-an-rpg-campaign";
import { howDoIMakeCombatFasterWithoutMakingItLessExciting } from "./how-do-i-make-combat-faster-without-making-it-less-exciting";
import { howDoIMakeDifferentCulturesFeelDistinctWithoutRelyingOnStereotypes } from "./how-do-i-make-different-cultures-feel-distinct-without-relying-on-stereotypes";
import { howDoIMakeInterviewingNpcsInterestingInAnInvestigation } from "./how-do-i-make-interviewing-npcs-interesting-in-an-investigation";
import { howDoIMakeRivalCaptainsNaviesAndPirateFactionsMatter } from "./how-do-i-make-rival-captains-navies-and-pirate-factions-matter";
import { howDoIMakeSeaTravelInterestingInATtrpg } from "./how-do-i-make-sea-travel-interesting-in-a-ttrpg";
import { howDoIOrganiseADndCampaign } from "./how-do-i-organise-a-dnd-campaign";
import { howDoIOrganiseGmNotesForInPersonPlay } from "./how-do-i-organise-gm-notes-for-in-person-play";
import { howDoIPaceAnRpgOneShot } from "./how-do-i-pace-an-rpg-one-shot";
import { howDoIPrepareADndSession } from "./how-do-i-prepare-a-dnd-session";
import { howDoIPrepareAnRpgSessionStepByStep } from "./how-do-i-prepare-an-rpg-session-step-by-step";
import { howDoIReadADndCharacterSheetAsABeginner } from "./how-do-i-read-a-dnd-character-sheet-as-a-beginner";
import { howDoIRunABardOrFaceWithoutSideliningTheParty } from "./how-do-i-run-a-bard-or-face-without-sidelining-the-party";
import { howDoIRunACampaignWhereThePlayersOwnABusiness } from "./how-do-i-run-a-campaign-where-the-players-own-a-business";
import { howDoIRunADiplomatNobleOrCourtierInAnRpg } from "./how-do-i-run-a-diplomat-noble-or-courtier-in-an-rpg";
import { howDoIRunAJournalistOrMediaCharacterInAnRpg } from "./how-do-i-run-a-journalist-or-media-character-in-an-rpg";
import { howDoIRunALargeBattleWhenThePlayerCharactersArePartOfAnArmy } from "./how-do-i-run-a-large-battle-when-the-player-characters-are-part-of-an-army";
import { howDoIRunAPirateCampaignFocusedOnExploration } from "./how-do-i-run-a-pirate-campaign-focused-on-exploration";
import { howDoIRunARogueOrScoutWithoutSplittingTheParty } from "./how-do-i-run-a-rogue-or-scout-without-splitting-the-party";
import { howDoIRunASuccessfulSessionZero } from "./how-do-i-run-a-successful-session-0";
import { howDoIRunAnInvestigatorWithoutSideliningTheParty } from "./how-do-i-run-an-investigator-without-sidelining-the-party";
import { howDoIRunCharacterRolesInAPoliticalIntrigueRpg } from "./how-do-i-run-character-roles-in-a-political-intrigue-rpg";
import { howDoIRunCharacterRolesInAnInvestigativeHorrorRpg } from "./how-do-i-run-character-roles-in-an-investigative-horror-rpg";
import { howDoIRunCommonCharacterRolesInAFantasyRpg } from "./how-do-i-run-common-character-roles-in-a-fantasy-rpg";
import { howDoIRunCommonCharacterRolesInASciFiOrSpaceOperaRpg } from "./how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg";
import { howDoIRunExplorationInAHugeRuinedCity } from "./how-do-i-run-exploration-in-a-huge-ruined-city";
import { howDoIRunHackersOrNetrunnersWithoutSplittingTheParty } from "./how-do-i-run-hackers-or-netrunners-without-splitting-the-party";
import { howDoIRunPoliticalIntrigueAndFactionPlay } from "./how-do-i-run-political-intrigue-and-faction-play";
import { howDoIRunShipToShipCombatWithoutSideliningTheParty } from "./how-do-i-run-ship-to-ship-combat-without-sidelining-the-party";
import { howDoIRunSpiesAndInfiltratorsInAnRpg } from "./how-do-i-run-spies-and-infiltrators-in-an-rpg";
import { howDoIStartADndCampaign } from "./how-do-i-start-a-dnd-campaign";
import { howDoIStartGmingForTheFirstTime } from "./how-do-i-start-gming-for-the-first-time";
import { howDoITakeUsefulRpgNotesDuringPlay } from "./how-do-i-take-useful-rpg-notes-during-play";
import { howDoITurnAnRpgIdeaIntoAnAdventure } from "./how-do-i-turn-an-rpg-idea-into-an-adventure";
import { howDoITurnEconomicPressuresIntoRpgAdventureHooks } from "./how-do-i-turn-economic-pressures-into-rpg-adventure-hooks";
import { howDoIUpgradeAPlayerCharactersWeaponWithoutReplacingIt } from "./how-do-i-upgrade-a-player-characters-weapon-without-replacing-it";
import { howDoIWriteAGoodCallOfCthulhuOneShot } from "./how-do-i-write-a-good-call-of-cthulhu-one-shot";
import { howDoScarcityAndShortagesAffectPricesAndConflictInAnRpgWorld } from "./how-do-scarcity-and-shortages-affect-prices-and-conflict-in-an-rpg-world";
import { howDoTradeRoutesShapeCitiesAndKingdomsInAnRpgWorld } from "./how-do-trade-routes-shape-cities-and-kingdoms-in-an-rpg-world";
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
import { howDoesMagicAffectPoliticsAndGovernment } from "./how-does-magic-affect-politics-and-government";
import { howDoesMagicChangeSocietyInAFantasyWorld } from "./how-does-magic-change-society-in-a-fantasy-world";
import { howDoesMagicCreateSocialClassesAndInequality } from "./how-does-magic-create-social-classes-and-inequality";
import { howLongShouldATtrpgSessionBe } from "./how-long-should-a-ttrpg-session-be";
import { howManyNpcsDoesAnRpgTownNeed } from "./how-many-npcs-does-an-rpg-town-need";
import { howMuchCampaignLoreShouldPlayersBeExpectedToRemember } from "./how-much-campaign-lore-should-players-be-expected-to-remember";
import { howMuchOfThePlotShouldADmPrepare } from "./how-much-of-the-plot-should-a-dm-prepare";
import { howMuchPrepDoYouNeedForAnRpgSession } from "./how-much-prep-do-you-need-for-an-rpg-session";
import { howMuchRuleOfCoolShouldADmAllow } from "./how-much-rule-of-cool-should-a-dm-allow";
import { howShouldAFantasyAdventuringGuildHandleWagesDuesAndSharedExpenses } from "./how-should-a-fantasy-adventuring-guild-handle-wages-dues-and-shared-expenses";
import { howShouldMagicHaveBeenDiscoveredInMyWorld } from "./how-should-magic-have-been-discovered-in-my-world";
import { howToCreateACyberpunkCityDistrict } from "./how-to-create-a-cyberpunk-city-district";
import { howToCreateASciFiStarSystemForAnRpg } from "./how-to-create-a-sci-fi-star-system-for-an-rpg";
import { howToCreateRumoursForAFantasyTown } from "./how-to-create-rumours-for-a-fantasy-town";
import { howToWriteAnInWorldNewspaperForAnRpg } from "./how-to-write-an-in-world-newspaper-for-an-rpg";
import { isMyRpgCampaignIdeaGood } from "./is-my-rpg-campaign-idea-good";
import { pointCrawlVsHexCrawl } from "./point-crawl-vs-hex-crawl";
import { whatCanIDoOnMyTurnInDndCombat } from "./what-can-i-do-on-my-turn-in-dnd-combat";
import { whatCanPlayersActuallyBuyAndSellInAFantasySettlement } from "./what-can-players-actually-buy-and-sell-in-a-fantasy-settlement";
import { whatDoINeedToBringToMyFirstDndGame } from "./what-do-i-need-to-bring-to-my-first-dnd-game";
import { whatDoYouDoWithMurderHobosInAnRpgCampaign } from "./what-do-you-do-with-murder-hobos-in-an-rpg-campaign";
import { whatIsAPointCrawl } from "./what-is-a-point-crawl";
import { whatIsTheDifferenceBetweenGodsAndDemonLordsInAFantasyWorld } from "./what-is-the-difference-between-gods-and-demon-lords-in-a-fantasy-world";
import { whatKindOfShipShouldAPirateCrewStartWith } from "./what-kind-of-ship-should-a-pirate-crew-start-with";
import { whatKindOfShipShouldASciFiRpgPartyStartWith } from "./what-kind-of-ship-should-a-sci-fi-rpg-party-start-with";
import { whatMakesAGoodHeistTargetInATabletopRpg } from "./what-makes-a-good-heist-target-in-a-tabletop-rpg";
import { whatMakesAGoodRandomEncounter } from "./what-makes-a-good-random-encounter";
import { whatRpgFeelsLikeDndButIsSimpler } from "./what-rpg-feels-like-dnd-but-is-simpler";
import { whatRpgMapMakingToolShouldIUse } from "./what-rpg-map-making-tool-should-i-use";
import { whatRpgShouldIPlayForAnOverTheTopSpaceOpera } from "./what-rpg-should-i-play-for-an-over-the-top-space-opera";
import { whatRpgShouldIPlayForInvestigativeHorror } from "./what-rpg-should-i-play-for-investigative-horror";
import { whatRpgShouldIUseForTacticalCombat } from "./what-rpg-should-i-use-for-tactical-combat";
import { whatRpgSystemIsGoodForSoloPlay } from "./what-rpg-system-is-good-for-solo-play";
import { whatRpgSystemShouldWeTryInsteadOfDnd } from "./what-rpg-system-should-we-try-instead-of-dnd";
import { whatRpgWorksForPoliticalIntrigueAndFactionPlay } from "./what-rpg-works-for-political-intrigue-and-faction-play";
import { whatShouldANewDndPlayerKnowBeforeTheirFirstGame } from "./what-should-a-new-dnd-player-know-before-their-first-game";
import { whatShouldANewDndPlayerLearnFirst } from "./what-should-a-new-dnd-player-learn-first";
import { whatShouldAnRpgSettlementContain } from "./what-should-an-rpg-settlement-contain";
import { whatShouldILookForInAnRpgCampaignManager } from "./what-should-i-look-for-in-an-rpg-campaign-manager";
import { whatShouldPlayersBeAbleToUpgradeInAnRpgBase } from "./what-should-players-be-able-to-upgrade-in-an-rpg-base";
import { whatTtrpgShouldIPlayForAPirateCampaign } from "./what-ttrpg-should-i-play-for-a-pirate-campaign";
import { whatTtrpgShouldIUseForAFantasyDungeonCrawl } from "./what-ttrpg-should-i-use-for-a-fantasy-dungeon-crawl";
import { whatTtrpgsLetYouBuildAndUpgradeABase } from "./what-ttrpgs-let-you-build-and-upgrade-a-base";
import { whereDoIStartIfIHaveNeverPlayedATabletopRpg } from "./where-do-i-start-if-i-have-never-played-a-tabletop-rpg";
import { whichDiceDoIRollInDndAndWhen } from "./which-dice-do-i-roll-in-dnd-and-when";
import { xpLevelingVsMilestoneLeveling } from "./xp-leveling-vs-milestone-leveling";

/**
 * The published answer library.
 *
 * Auto-generated by scripts/sync-answers.ts. Do not edit directly.
 * To add a new answer, create a file in `pages/<slug>.ts` and run `bun sync:answers`.
 */
export const answers: Record<string, AnswerConfig> = Object.fromEntries(
  [
    canMultipleGodsShareADomain,
    canYouPlayATabletopRpgIn30MinuteSessions,
    howCommonShouldMagicBeInAFantasyWorld,
    howDoFantasyCitiesDefendAgainstFlyingCreaturesAndTeleportation,
    howDoIBalanceRpgCombatEncountersWithoutATpk,
    howDoIBuildABelievableConstitutionalCrisisOrCoup,
    howDoIBuildABelievableEconomyForAFantasyWorld,
    howDoICreateInterestingIslandsAndPortsForAPirateCampaign,
    howDoIDecideWhatASettlementProducesImportsAndExports,
    howDoIExpandASimpleRpgCampaignIdea,
    howDoIFindATabletopRpgGroupToPlayWith,
    howDoIGetMyRpgPartyToWorkTogether,
    howDoIGetPlayersToEngageWithMyCampaignWorld,
    howDoIGiveDifferentCivilisationsDistinctStrengthsAndWeaknesses,
    howDoIGiveSpecialistCharactersSpotlight,
    howDoIHandleDivinationMagicWithoutLettingOneCharacterSolveEveryMystery,
    howDoIHandlePlayersAskingAnNpcToTellUsEverythingYouKnow,
    howDoIImproviseNpcsInDnd,
    howDoIKeepPlayersEngagedDuringOtherPlayersTurnsInCombat,
    howDoIMakeACampaignThreatFeelUrgentWithoutRailroading,
    howDoIMakeAPlayerBaseMatterInAnRpgCampaign,
    howDoIMakeCombatFasterWithoutMakingItLessExciting,
    howDoIMakeDifferentCulturesFeelDistinctWithoutRelyingOnStereotypes,
    howDoIMakeInterviewingNpcsInterestingInAnInvestigation,
    howDoIMakeRivalCaptainsNaviesAndPirateFactionsMatter,
    howDoIMakeSeaTravelInterestingInATtrpg,
    howDoIOrganiseADndCampaign,
    howDoIOrganiseGmNotesForInPersonPlay,
    howDoIPaceAnRpgOneShot,
    howDoIPrepareADndSession,
    howDoIPrepareAnRpgSessionStepByStep,
    howDoIReadADndCharacterSheetAsABeginner,
    howDoIRunABardOrFaceWithoutSideliningTheParty,
    howDoIRunACampaignWhereThePlayersOwnABusiness,
    howDoIRunADiplomatNobleOrCourtierInAnRpg,
    howDoIRunAJournalistOrMediaCharacterInAnRpg,
    howDoIRunALargeBattleWhenThePlayerCharactersArePartOfAnArmy,
    howDoIRunAPirateCampaignFocusedOnExploration,
    howDoIRunARogueOrScoutWithoutSplittingTheParty,
    howDoIRunASuccessfulSessionZero,
    howDoIRunAnInvestigatorWithoutSideliningTheParty,
    howDoIRunCharacterRolesInAPoliticalIntrigueRpg,
    howDoIRunCharacterRolesInAnInvestigativeHorrorRpg,
    howDoIRunCommonCharacterRolesInAFantasyRpg,
    howDoIRunCommonCharacterRolesInASciFiOrSpaceOperaRpg,
    howDoIRunExplorationInAHugeRuinedCity,
    howDoIRunHackersOrNetrunnersWithoutSplittingTheParty,
    howDoIRunPoliticalIntrigueAndFactionPlay,
    howDoIRunShipToShipCombatWithoutSideliningTheParty,
    howDoIRunSpiesAndInfiltratorsInAnRpg,
    howDoIStartADndCampaign,
    howDoIStartGmingForTheFirstTime,
    howDoITakeUsefulRpgNotesDuringPlay,
    howDoITurnAnRpgIdeaIntoAnAdventure,
    howDoITurnEconomicPressuresIntoRpgAdventureHooks,
    howDoIUpgradeAPlayerCharactersWeaponWithoutReplacingIt,
    howDoIWriteAGoodCallOfCthulhuOneShot,
    howDoScarcityAndShortagesAffectPricesAndConflictInAnRpgWorld,
    howDoTradeRoutesShapeCitiesAndKingdomsInAnRpgWorld,
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
    howDoesMagicAffectPoliticsAndGovernment,
    howDoesMagicChangeSocietyInAFantasyWorld,
    howDoesMagicCreateSocialClassesAndInequality,
    howLongShouldATtrpgSessionBe,
    howManyNpcsDoesAnRpgTownNeed,
    howMuchCampaignLoreShouldPlayersBeExpectedToRemember,
    howMuchOfThePlotShouldADmPrepare,
    howMuchPrepDoYouNeedForAnRpgSession,
    howMuchRuleOfCoolShouldADmAllow,
    howShouldAFantasyAdventuringGuildHandleWagesDuesAndSharedExpenses,
    howShouldMagicHaveBeenDiscoveredInMyWorld,
    howToCreateACyberpunkCityDistrict,
    howToCreateASciFiStarSystemForAnRpg,
    howToCreateRumoursForAFantasyTown,
    howToWriteAnInWorldNewspaperForAnRpg,
    isMyRpgCampaignIdeaGood,
    pointCrawlVsHexCrawl,
    whatCanIDoOnMyTurnInDndCombat,
    whatCanPlayersActuallyBuyAndSellInAFantasySettlement,
    whatDoINeedToBringToMyFirstDndGame,
    whatDoYouDoWithMurderHobosInAnRpgCampaign,
    whatIsAPointCrawl,
    whatIsTheDifferenceBetweenGodsAndDemonLordsInAFantasyWorld,
    whatKindOfShipShouldAPirateCrewStartWith,
    whatKindOfShipShouldASciFiRpgPartyStartWith,
    whatMakesAGoodHeistTargetInATabletopRpg,
    whatMakesAGoodRandomEncounter,
    whatRpgFeelsLikeDndButIsSimpler,
    whatRpgMapMakingToolShouldIUse,
    whatRpgShouldIPlayForAnOverTheTopSpaceOpera,
    whatRpgShouldIPlayForInvestigativeHorror,
    whatRpgShouldIUseForTacticalCombat,
    whatRpgSystemIsGoodForSoloPlay,
    whatRpgSystemShouldWeTryInsteadOfDnd,
    whatRpgWorksForPoliticalIntrigueAndFactionPlay,
    whatShouldANewDndPlayerKnowBeforeTheirFirstGame,
    whatShouldANewDndPlayerLearnFirst,
    whatShouldAnRpgSettlementContain,
    whatShouldILookForInAnRpgCampaignManager,
    whatShouldPlayersBeAbleToUpgradeInAnRpgBase,
    whatTtrpgShouldIPlayForAPirateCampaign,
    whatTtrpgShouldIUseForAFantasyDungeonCrawl,
    whatTtrpgsLetYouBuildAndUpgradeABase,
    whereDoIStartIfIHaveNeverPlayedATabletopRpg,
    whichDiceDoIRollInDndAndWhen,
    xpLevelingVsMilestoneLeveling,
  ]
    .map((answer) => AnswerConfigSchema.parse(answer))
    .map((answer) => [answer.slug, answer]),
);
