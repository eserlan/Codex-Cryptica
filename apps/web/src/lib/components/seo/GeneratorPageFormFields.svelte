<script lang="ts">
  import RPGNPCFormFields from "$lib/components/seo/RPGNPCFormFields.svelte";
  import FactionFormFields from "$lib/components/seo/FactionFormFields.svelte";
  import FactionRosterFormFields from "$lib/components/seo/FactionRosterFormFields.svelte";
  import QuestFormFields from "$lib/components/seo/QuestFormFields.svelte";
  import PersonalityFormFields from "$lib/components/seo/PersonalityFormFields.svelte";
  import RumourFormFields from "$lib/components/seo/RumourFormFields.svelte";
  import EncounterFormFields from "$lib/components/seo/EncounterFormFields.svelte";
  import PuzzleFormFields from "$lib/components/seo/PuzzleFormFields.svelte";
  import CouncilVoteFormFields from "$lib/components/seo/CouncilVoteFormFields.svelte";
  import HeistFormFields from "$lib/components/seo/HeistFormFields.svelte";
  import SecretSocietyFormFields from "$lib/components/seo/SecretSocietyFormFields.svelte";
  import SettlementFormFields from "$lib/components/seo/SettlementFormFields.svelte";
  import MagicItemFormFields from "$lib/components/seo/MagicItemFormFields.svelte";
  import MinorMagicItemFormFields from "$lib/components/seo/MinorMagicItemFormFields.svelte";
  import ArtifactFormFields from "$lib/components/seo/ArtifactFormFields.svelte";
  import TavernFormFields from "$lib/components/seo/TavernFormFields.svelte";
  import SocialHubFormFields from "$lib/components/seo/SocialHubFormFields.svelte";
  import KingdomFormFields from "$lib/components/seo/KingdomFormFields.svelte";
  import NationFormFields from "$lib/components/seo/NationFormFields.svelte";
  import VampireFormFields from "$lib/components/seo/VampireFormFields.svelte";
  import NomadClanFormFields from "$lib/components/seo/NomadClanFormFields.svelte";
  import DarkFactionFormFields from "$lib/components/seo/DarkFactionFormFields.svelte";
  import NameFormFields from "$lib/components/seo/NameFormFields.svelte";
  import NPCFormFields from "$lib/components/seo/NPCFormFields.svelte";
  import PantheonFormFields from "$lib/components/seo/PantheonFormFields.svelte";
  import ShipFormFields from "$lib/components/seo/ShipFormFields.svelte";
  import LanguageFormFields from "$lib/components/seo/LanguageFormFields.svelte";
  import NewsSheetFormFields from "$lib/components/seo/NewsSheetFormFields.svelte";
  import DungeonFormFields from "$lib/components/seo/DungeonFormFields.svelte";
  import AdventureFormFields from "$lib/components/seo/AdventureFormFields.svelte";
  import PlotTwistFormFields from "$lib/components/seo/PlotTwistFormFields.svelte";
  import VillainFormFields from "$lib/components/seo/VillainFormFields.svelte";
  import ComicBookEventFormFields from "$lib/components/seo/ComicBookEventFormFields.svelte";
  import OriginFormFields from "$lib/components/seo/OriginFormFields.svelte";
  import VillainSchemeFormFields from "$lib/components/seo/VillainSchemeFormFields.svelte";
  import WorldFormFields from "$lib/components/seo/WorldFormFields.svelte";
  import StarSystemFormFields from "$lib/components/seo/StarSystemFormFields.svelte";
  import ConstellationFormFields from "$lib/components/seo/ConstellationFormFields.svelte";
  import AlienRaceFormFields from "$lib/components/seo/AlienRaceFormFields.svelte";
  import CreatureFormFields from "$lib/components/seo/CreatureFormFields.svelte";
  type StringState = Record<string, string>;
  type PantheonState = StringState & {
    mode: "single" | "pantheon";
    size: "small" | "medium" | "large";
    width: "balanced" | "focused" | "wide";
  };
  type ModeState = StringState & { mode: "dossier" | "table-card" };
  type ConstellationState = StringState & { mode: "single" | "night-sky" };

  let {
    slug,
    activeTheme = $bindable(),
    urlHubTheme,
    trigger,
    npc = $bindable(),
    settlement = $bindable(),
    magicItem = $bindable(),
    minorMagicItem = $bindable(),
    artifact = $bindable(),
    faction = $bindable(),
    factionRoster = $bindable(),
    quest = $bindable(),
    personality = $bindable(),
    rumour = $bindable(),
    encounter = $bindable(),
    puzzle = $bindable(),
    councilVote = $bindable(),
    heist = $bindable(),
    secretSociety = $bindable(),
    kingdom = $bindable(),
    nation = $bindable(),
    socialHub = $bindable(),
    tavern = $bindable(),
    vampireClan = $bindable(),
    nomadClan = $bindable(),
    darkFaction = $bindable(),
    names = $bindable(),
    dndNpc = $bindable(),
    pantheon = $bindable(),
    ship = $bindable(),
    language = $bindable(),
    newsSheet = $bindable(),
    dungeon = $bindable(),
    adventure = $bindable(),
    plotTwist = $bindable(),
    villain = $bindable(),
    comicBookEvent = $bindable(),
    origin = $bindable(),
    villainScheme = $bindable(),
    world = $bindable(),
    starSystem = $bindable(),
    constellation = $bindable(),
    alienRace = $bindable(),
    creature = $bindable(),
    onPersonalityGenreChange,
    onRumourGenreChange,
    onPuzzleGenreChange,
    onShipGenreChange,
    onWorldGenreChange,
    onStarSystemGenreChange,
    onAlienRaceGenreChange,
    onCreatureGenreChange,
  }: {
    slug: string;
    activeTheme: string;
    urlHubTheme?: string;
    trigger: () => void;
    npc: ModeState & StringState;
    settlement: StringState;
    magicItem: StringState;
    minorMagicItem: StringState;
    artifact: StringState;
    faction: StringState;
    factionRoster: StringState;
    quest: StringState;
    personality: StringState;
    rumour: StringState;
    encounter: StringState;
    puzzle: StringState;
    councilVote: StringState;
    heist: StringState;
    secretSociety: StringState;
    kingdom: StringState;
    nation: StringState;
    socialHub: StringState;
    tavern: StringState;
    vampireClan: StringState;
    nomadClan: StringState;
    darkFaction: StringState;
    names: StringState;
    dndNpc: ModeState & StringState;
    pantheon: PantheonState;
    ship: StringState;
    language: StringState;
    newsSheet: StringState;
    dungeon: StringState;
    adventure: StringState;
    plotTwist: StringState;
    villain: StringState;
    comicBookEvent: StringState;
    origin: StringState;
    villainScheme: StringState;
    world: StringState;
    starSystem: StringState;
    constellation: ConstellationState;
    alienRace: StringState;
    creature: StringState;
    onPersonalityGenreChange: (genre: string) => void;
    onRumourGenreChange: (genre: string) => void;
    onPuzzleGenreChange: (genre: string) => void;
    onShipGenreChange: (genre: string) => void;
    onWorldGenreChange: (genre: string) => void;
    onStarSystemGenreChange: (genre: string) => void;
    onAlienRaceGenreChange: (genre: string) => void;
    onCreatureGenreChange: (genre: string) => void;
  } = $props();
</script>

{#if slug === "npc"}
  <RPGNPCFormFields
    bind:theme={activeTheme}
    bind:ancestry={npc.ancestry}
    bind:role={npc.role}
    bind:alignment={npc.alignment}
    bind:campaignContext={npc.campaignContext}
    bind:mode={npc.mode}
    onSurprise={trigger}
  />
{:else if slug === "settlement"}
  <SettlementFormFields
    genre={settlement.genre}
    bind:size={settlement.size}
    bind:environment={settlement.environment}
    bind:primaryFunction={settlement.primaryFunction}
    bind:tone={settlement.tone}
    bind:mainTension={settlement.mainTension}
    bind:campaignContext={settlement.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "magic-item" || slug === "item"}
  <MagicItemFormFields
    bind:type={magicItem.type}
    bind:rarity={magicItem.rarity}
    bind:campaignContext={magicItem.campaignContext}
  />
{:else if slug === "minor-magic-item"}
  <MinorMagicItemFormFields
    bind:theme={activeTheme}
    bind:form={minorMagicItem.form}
    bind:usageLimit={minorMagicItem.usageLimit}
    bind:utility={minorMagicItem.utility}
    bind:activation={minorMagicItem.activation}
    bind:quirkSeverity={minorMagicItem.quirkSeverity}
    bind:campaignContext={minorMagicItem.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "artifact-generator"}
  <ArtifactFormFields
    bind:theme={activeTheme}
    bind:form={artifact.form}
    bind:originEra={artifact.originEra}
    bind:powerTier={artifact.powerTier}
    bind:currentStatus={artifact.currentStatus}
    bind:curseCost={artifact.curseCost}
    bind:campaignContext={artifact.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "faction"}
  <FactionFormFields
    bind:theme={activeTheme}
    bind:type={faction.type}
    bind:scope={faction.scope}
    bind:alignment={faction.alignment}
    bind:campaignContext={faction.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "faction-roster"}
  <FactionRosterFormFields
    bind:theme={activeTheme}
    bind:size={factionRoster.size}
    bind:structure={factionRoster.structure}
    bind:emphasis={factionRoster.emphasis}
    bind:factionContext={factionRoster.factionContext}
    bind:campaignContext={factionRoster.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "quest"}
  <QuestFormFields
    bind:theme={activeTheme}
    bind:tone={quest.tone}
    bind:scope={quest.scope}
    bind:locationType={quest.locationType}
    bind:threat={quest.threat}
    bind:twist={quest.twist}
    bind:reward={quest.reward}
    bind:campaignContext={quest.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "personality"}
  <PersonalityFormFields
    bind:genre={personality.genre}
    bind:roleHint={personality.roleHint}
    bind:temperament={personality.temperament}
    bind:socialStyle={personality.socialStyle}
    bind:moralOutlook={personality.moralOutlook}
    bind:emotionalOpenness={personality.emotionalOpenness}
    bind:confidence={personality.confidence}
    bind:optimism={personality.optimism}
    bind:expressiveness={personality.expressiveness}
    bind:cooperationStyle={personality.cooperationStyle}
    bind:ageOrLifeStage={personality.ageOrLifeStage}
    bind:relationshipContext={personality.relationshipContext}
    bind:concept={personality.concept}
    bind:campaignContext={personality.campaignContext}
    onGenreChange={onPersonalityGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "rumour"}
  <RumourFormFields
    bind:genre={rumour.genre}
    bind:tone={rumour.tone}
    bind:dangerLevel={rumour.dangerLevel}
    bind:subjectFocus={rumour.subjectFocus}
    bind:locationContext={rumour.locationContext}
    bind:campaignContext={rumour.campaignContext}
    onGenreChange={onRumourGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "encounter"}
  <EncounterFormFields
    bind:theme={activeTheme}
    bind:encounterType={encounter.encounterType}
    bind:environment={encounter.environment}
    bind:threat={encounter.threat}
    bind:tone={encounter.tone}
    bind:context={encounter.context}
    onSurprise={trigger}
  />
{:else if slug === "puzzle"}
  <PuzzleFormFields
    bind:genre={puzzle.genre}
    bind:purpose={puzzle.purpose}
    bind:complexity={puzzle.complexity}
    bind:style={puzzle.style}
    bind:partyLevel={puzzle.partyLevel}
    bind:playerCount={puzzle.playerCount}
    bind:capabilities={puzzle.capabilities}
    bind:participationStyle={puzzle.participationStyle}
    bind:failurePressure={puzzle.failurePressure}
    bind:system={puzzle.system}
    bind:downstreamConsequence={puzzle.downstreamConsequence}
    bind:campaignContext={puzzle.campaignContext}
    onGenreChange={onPuzzleGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "council-vote"}
  <CouncilVoteFormFields
    bind:theme={activeTheme}
    bind:proposal={councilVote.proposal}
    bind:governingBodyType={councilVote.governingBodyType}
    bind:councilSize={councilVote.councilSize}
    bind:votingRule={councilVote.votingRule}
    bind:deadline={councilVote.deadline}
    bind:scope={councilVote.scope}
    bind:tone={councilVote.tone}
    bind:antagonistInfluence={councilVote.antagonistInfluence}
    bind:campaignContext={councilVote.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "heist"}
  <HeistFormFields
    bind:theme={activeTheme}
    bind:heistType={heist.heistType}
    bind:targetScale={heist.targetScale}
    bind:targetType={heist.targetType}
    bind:prize={heist.prize}
    bind:campaignContext={heist.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "secret-society"}
  <SecretSocietyFormFields
    bind:theme={activeTheme}
    bind:tone={secretSociety.tone}
    bind:scale={secretSociety.scale}
    bind:publicFace={secretSociety.publicFace}
    bind:dangerLevel={secretSociety.dangerLevel}
    bind:truthRelationship={secretSociety.truthRelationship}
    bind:campaignContext={secretSociety.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "kingdom"}
  <KingdomFormFields
    bind:polityType={kingdom.polityType}
    bind:governmentStyle={kingdom.governmentStyle}
    bind:geography={kingdom.geography}
    bind:scale={kingdom.scale}
    bind:conflictLevel={kingdom.conflictLevel}
    bind:magicLevel={kingdom.magicLevel}
    bind:campaignContext={kingdom.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "nation"}
  <NationFormFields
    bind:genre={nation.genre}
    bind:polityType={nation.polityType}
    bind:governmentStyle={nation.governmentStyle}
    bind:scale={nation.scale}
    bind:conflictLevel={nation.conflictLevel}
    bind:campaignContext={nation.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "social-hub"}
  <SocialHubFormFields
    bind:genre={socialHub.genre}
    bind:venueType={socialHub.venueType}
    bind:atmosphere={socialHub.atmosphere}
    bind:wealthLevel={socialHub.wealthLevel}
    bind:clientele={socialHub.clientele}
    bind:campaignContext={socialHub.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "tavern"}
  <TavernFormFields
    bind:type={tavern.type}
    bind:atmosphere={tavern.atmosphere}
    bind:settlementType={tavern.settlementType}
    bind:wealthLevel={tavern.wealthLevel}
    bind:clientele={tavern.clientele}
    bind:campaignContext={tavern.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "vampire-clan"}
  <VampireFormFields
    bind:archetype={vampireClan.archetype}
    bind:bloodline={vampireClan.bloodline}
    bind:feedingHabit={vampireClan.feedingHabit}
    bind:weakness={vampireClan.weakness}
    bind:campaignContext={vampireClan.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "nomad-clan"}
  <NomadClanFormFields
    bind:role={nomadClan.role}
    bind:tone={nomadClan.tone}
    bind:territory={nomadClan.territory}
    bind:conflict={nomadClan.conflict}
    bind:campaignContext={nomadClan.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "dark-fantasy-faction"}
  <DarkFactionFormFields
    bind:mode={darkFaction.mode}
    bind:factionType={darkFaction.factionType}
    bind:scope={darkFaction.scope}
    bind:moralPosture={darkFaction.moralPosture}
    bind:campaignContext={darkFaction.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "names"}
  <NameFormFields
    bind:theme={activeTheme}
    showTheme={true}
    bind:culture={names.culture}
    bind:gender={names.gender}
    bind:nameType={names.nameType}
    bind:context={names.context}
  />
{:else if slug === "fantasy-names"}
  <NameFormFields
    bind:culture={names.culture}
    bind:gender={names.gender}
    bind:nameType={names.nameType}
    bind:context={names.context}
  />
{:else if slug === "dnd-npc"}
  <NPCFormFields
    bind:race={dndNpc.race}
    bind:role={dndNpc.role}
    bind:alignment={dndNpc.alignment}
    bind:campaignContext={dndNpc.campaignContext}
    bind:mode={dndNpc.mode}
    onSurprise={trigger}
  />
{:else if slug === "pantheon-generator" || slug === "god-generator"}
  <PantheonFormFields
    bind:mode={pantheon.mode}
    bind:genre={pantheon.genre}
    bind:divineType={pantheon.divineType}
    bind:domain={pantheon.domain}
    bind:tone={pantheon.tone}
    bind:worshippers={pantheon.worshippers}
    bind:conflictTheme={pantheon.conflictTheme}
    bind:size={pantheon.size}
    bind:width={pantheon.width}
    bind:campaignContext={pantheon.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "ship-generator"}
  <ShipFormFields
    bind:genre={ship.genre}
    bind:role={ship.role}
    bind:scale={ship.scale}
    bind:condition={ship.condition}
    bind:tone={ship.tone}
    bind:campaignContext={ship.campaignContext}
    onGenreChange={onShipGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "language-generator"}
  <LanguageFormFields
    bind:genre={language.genre}
    bind:tone={language.tone}
    bind:role={language.role}
    bind:structure={language.structure}
    bind:campaignContext={language.campaignContext}
    preserveGenreOnSurprise={Boolean(urlHubTheme)}
    onSurprise={trigger}
  />
{:else if slug === "news-sheet-generator"}
  <NewsSheetFormFields
    bind:genre={newsSheet.genre}
    bind:publicationType={newsSheet.publicationType}
    bind:tone={newsSheet.tone}
    bind:bias={newsSheet.bias}
    bind:censorLevel={newsSheet.censorLevel}
    bind:hookDensity={newsSheet.hookDensity}
    bind:placeName={newsSheet.placeName}
    bind:headlineEvent={newsSheet.headlineEvent}
    bind:campaignContext={newsSheet.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "dungeon-generator"}
  <DungeonFormFields
    bind:theme={activeTheme}
    bind:purpose={dungeon.purpose}
    bind:currentState={dungeon.currentState}
    bind:scale={dungeon.scale}
    bind:campaignContext={dungeon.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "adventure-generator" || slug === "adventure-idea-generator"}
  <AdventureFormFields
    bind:theme={activeTheme}
    bind:archetype={adventure.archetype}
    bind:scale={adventure.scale}
    bind:tone={adventure.tone}
    bind:seed={adventure.seed}
    bind:campaignContext={adventure.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "plot-twist-generator"}
  <PlotTwistFormFields
    bind:theme={activeTheme}
    bind:twistType={plotTwist.twistType}
    bind:impact={plotTwist.impact}
    bind:timing={plotTwist.timing}
    bind:foreshadowing={plotTwist.foreshadowing}
    bind:premise={plotTwist.premise}
    bind:constraints={plotTwist.constraints}
    bind:campaignContext={plotTwist.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "bbeg-generator"}
  <VillainFormFields
    bind:theme={activeTheme}
    bind:tone={villain.tone}
    bind:threatScale={villain.threatScale}
    bind:archetype={villain.archetype}
    bind:sympathy={villain.sympathy}
    bind:worldRelation={villain.worldRelation}
    bind:campaignContext={villain.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "comic-book-event-generator"}
  <ComicBookEventFormFields
    bind:eventType={comicBookEvent.eventType}
    bind:scale={comicBookEvent.scale}
    bind:tone={comicBookEvent.tone}
    bind:campaignContext={comicBookEvent.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "origin-generator"}
  <OriginFormFields
    bind:originType={origin.originType}
    bind:tone={origin.tone}
    bind:campaignContext={origin.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "villain-scheme-generator"}
  <VillainSchemeFormFields
    bind:powerScale={villainScheme.powerScale}
    bind:tone={villainScheme.tone}
    bind:schemeType={villainScheme.schemeType}
    bind:villainProfile={villainScheme.villainProfile}
    bind:campaignContext={villainScheme.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "world"}
  <WorldFormFields
    bind:worldType={world.worldType}
    bind:habitability={world.habitability}
    bind:civilisation={world.civilisation}
    bind:societalModel={world.societalModel}
    bind:worldTagOne={world.worldTagOne}
    bind:worldTagTwo={world.worldTagTwo}
    bind:genre={world.genre}
    bind:lancerWorldFrame={world.lancerWorldFrame}
    bind:campaignPressure={world.campaignPressure}
    bind:dominantFeature={world.dominantFeature}
    bind:campaignContext={world.campaignContext}
    onGenreChange={onWorldGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "star-system"}
  <StarSystemFormFields
    bind:systemType={starSystem.systemType}
    bind:genre={starSystem.genre}
    bind:civilisationLevel={starSystem.civilisationLevel}
    bind:systemCharacter={starSystem.systemCharacter}
    bind:scientificRealism={starSystem.scientificRealism}
    bind:campaignContext={starSystem.campaignContext}
    onGenreChange={onStarSystemGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "constellation"}
  <ConstellationFormFields
    bind:mode={constellation.mode}
    bind:theme={activeTheme}
    bind:visualImpression={constellation.visualImpression}
    bind:practicalUse={constellation.practicalUse}
    bind:culturalMeaning={constellation.culturalMeaning}
    bind:campaignContext={constellation.campaignContext}
    onSurprise={trigger}
  />
{:else if slug === "alien-race"}
  <AlienRaceFormFields
    bind:genre={alienRace.genre}
    bind:generationMode={alienRace.generationMode}
    bind:homeEnvironment={alienRace.homeEnvironment}
    bind:bodyPlan={alienRace.bodyPlan}
    bind:psychology={alienRace.psychology}
    bind:socialOrganisation={alienRace.socialOrganisation}
    bind:technologyLevel={alienRace.technologyLevel}
    bind:relationToOutsiders={alienRace.relationToOutsiders}
    bind:campaignContext={alienRace.campaignContext}
    onGenreChange={onAlienRaceGenreChange}
    onSurprise={trigger}
  />
{:else if slug === "creature"}
  <CreatureFormFields
    bind:genre={creature.genre}
    bind:category={creature.category}
    bind:threatLevel={creature.threatLevel}
    bind:size={creature.size}
    bind:temperament={creature.temperament}
    bind:habitat={creature.habitat}
    bind:ecologicalRole={creature.ecologicalRole}
    bind:campaignContext={creature.campaignContext}
    onGenreChange={onCreatureGenreChange}
    onSurprise={trigger}
  />
{/if}
