/**
 * Alien Race Generator (#2122) — produces a coherent alien species rather than
 * "humans with unusual appearances".
 *
 * The organising principle is **consequence**: every major biological or
 * environmental trait must visibly change something else about the species.
 * Six limbs should show up in their tools and architecture; chemical
 * communication should change what privacy and deception mean to them;
 * extreme longevity should change how their politics and inheritance work.
 *
 * That principle is enforced in two places, deliberately:
 *   - The **local fallback** encodes it structurally. Each trait profile below
 *     carries the downstream consequences it implies, and the generated
 *     sections are assembled from those consequences rather than from
 *     independent per-section option pools. A local draft therefore cannot
 *     produce a six-limbed species whose technology ignores its limbs.
 *   - The **prompt** states it as a rule and closes with a consistency pass
 *     naming the specific cross-section links to verify.
 *
 * Framework-free, for the marketing/SEO generator surface (no login, no vault
 * context) — mirrors the public-star-system.ts / public-world.ts split used by
 * every generator with an in-app, vault-grounded sibling.
 */

import type { PublicGeneratorOutput } from "./public-generator-adapters";
export {
  GROUNDED_MODE,
  FREEFORM_MODE,
  alienRaceConfig,
} from "./public-alien-race-constants";

import { parseFencedJson, sanitizeText } from "./llm-response-utils";
import { defaultRng, pickFrom, type Rng } from "./random-utils";
import { withPublicCreativeCue } from "./public-creative-diversity";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./public-npc-constants";
import {
  avoidNamesExcludingContext,
  formatCampaignContextBlock,
} from "./campaign-context";
import {
  GROUNDED_MODE,
  FREEFORM_MODE,
  alienRaceConfig,
  BODY_PLANS,
  ENVIRONMENTS,
  COMMUNICATION,
  LIFESPANS,
  PSYCHOLOGIES,
  CONTINGENCIES,
  RELATIONS,
  type TraitProfile,
  type BodyPlanProfile,
  type EnvironmentProfile,
  type CommunicationProfile,
  type LifespanProfile,
} from "./public-alien-race-constants";

export interface AlienRaceGeneratorOptions {
  genre?: string;
  generationMode?: string;
  homeEnvironment?: string;
  bodyPlan?: string;
  psychology?: string;
  socialOrganisation?: string;
  technologyLevel?: string;
  relationToOutsiders?: string;
  /** Free-text world/campaign background from the form's context field. */
  campaignContext?: string;
  /** Existing titles to avoid when making a local fallback. */
  avoidNames?: string[];
}

export interface AlienRacePrompt {
  systemInstruction: string;
  userMessage: string;
}

/** The fully-resolved trait set a draft was built from. */
export interface ResolvedAlienRace {
  genre: string;
  generationMode: string;
  homeEnvironment: string;
  bodyPlan: string;
  psychology: string;
  socialOrganisation: string;
  technologyLevel: string;
  relationToOutsiders: string;
}

function choose(
  value: string | undefined,
  choices: readonly string[],
  rng: Rng,
): string {
  return value?.trim() || pickFrom(choices, rng);
}

const isFreeform = (mode: string) =>
  mode.trim().toLowerCase() === FREEFORM_MODE.toLowerCase();

/** Profile fragments are stored lowercase so they can start or continue a sentence. */
const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Indefinite article for a following word. The technology levels are the only
 * place this matters — "an industrial level" but "a pre-industrial level" —
 * and a first-letter vowel check covers every value in that pool.
 */
const article = (word: string) => (/^[aeiou]/i.test(word.trim()) ? "an" : "a");

/**
 * Resolves a trait against its pool, honouring the generation mode: an exotic
 * trait is only reachable in Freeform mode, but an explicit user choice is
 * always respected (the form can offer a custom value, and a user who typed
 * "Crystalline lattice" meant it).
 */
function chooseProfile<T extends TraitProfile>(
  value: string | undefined,
  profiles: readonly T[],
  mode: string,
  rng: Rng,
): T {
  const requested = value?.trim();
  if (requested) {
    const match = profiles.find(
      (p) => p.name.toLowerCase() === requested.toLowerCase(),
    );
    if (match) return match;
  }
  const available = isFreeform(mode)
    ? profiles
    : profiles.filter((p) => !p.exotic);
  return pickFrom(available.length ? available : profiles, rng);
}

function chooseName(avoidNames: readonly string[], rng: Rng): string {
  const forbidden = new Set(
    avoidNames.map((name) => name.trim().toLowerCase()),
  );
  const available = alienRaceConfig.names.filter(
    (name) => !forbidden.has(name.toLowerCase()),
  );
  return pickFrom(available.length ? available : alienRaceConfig.names, rng);
}

function label(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Picks the communication channel the body plan and environment actually
 * support, rather than rolling it independently — this is the consequence
 * principle applied to a trait the form does not expose. A species with no
 * line of sight in a dense jungle does not signal by light.
 */
function deriveCommunication(
  bodyPlan: BodyPlanProfile,
  environment: EnvironmentProfile,
  rng: Rng,
): CommunicationProfile {
  const byName = (name: string) =>
    COMMUNICATION.find((c) => c.name === name) ?? COMMUNICATION[0];

  // The environment vetoes first: a medium that cannot carry a channel beats
  // any preference the body plan has. Vacuum carries neither air-borne
  // chemistry nor sound; open water carries no air-borne chemistry.
  const supported = COMMUNICATION.filter((channel) => {
    if (environment.name === "Deep void") {
      return (
        channel.name === "Electromagnetic field modulation" ||
        channel.name === "Bioluminescent patterning"
      );
    }
    if (environment.name === "Ocean world") {
      return channel.name !== "Chemical / pheromonal";
    }
    // Short sightlines make visual signalling useless.
    if (environment.name === "Dense-jungle world") {
      return channel.name !== "Bioluminescent patterning";
    }
    return true;
  });
  const supports = (name: string) => supported.some((c) => c.name === name);

  // Body-plan preferences, honoured only where the environment allows.
  const preferred =
    bodyPlan.name === "Plasma-bound field" ||
    bodyPlan.name === "Self-replicating machine lineage"
      ? "Electromagnetic field modulation"
      : bodyPlan.name === "Colonial swarm"
        ? "Chemical / pheromonal"
        : bodyPlan.name === "Crystalline lattice"
          ? "Infrasound"
          : undefined;
  if (preferred && supports(preferred)) return byName(preferred);
  // A plasma or machine lineage always reaches EM, whatever the medium.
  if (preferred === "Electromagnetic field modulation")
    return byName(preferred);

  const available = supported.length ? supported : COMMUNICATION;
  const grounded = available.filter((c) => !c.exotic);
  return pickFrom(grounded.length ? grounded : available, rng);
}

/** Longevity follows metabolism, which follows the environment. */
function deriveLifespan(
  environment: EnvironmentProfile,
  bodyPlan: BodyPlanProfile,
  mode: string,
  rng: Rng,
): LifespanProfile {
  const byName = (name: string) =>
    LIFESPANS.find((l) => l.name === name) ?? LIFESPANS[1];

  // Keyed off the body plan itself rather than the mode: an exotic body plan
  // can still be reached in Grounded mode by choosing it explicitly, and a
  // machine lineage with a twenty-five-year biological lifespan would
  // contradict the trait it was derived from.
  if (bodyPlan.name === "Self-replicating machine lineage") {
    return byName("Effectively perpetual");
  }
  if (bodyPlan.name === "Chitinous exoskeletal") {
    return byName("Metamorphic castes");
  }
  // Cold, slow metabolisms live long; crowded, high-predation ones do not.
  if (environment.name === "Ice world" || environment.name === "Deep void") {
    return byName("Extended");
  }
  if (environment.name === "Dense-jungle world") return byName("Brief");
  // An explicitly-chosen exotic trait unlocks the exotic lifespans alongside
  // it, so the species stays internally consistent whatever the mode says.
  const allowExotic =
    isFreeform(mode) || !!bodyPlan.exotic || !!environment.exotic;
  const available = allowExotic
    ? LIFESPANS
    : LIFESPANS.filter((l) => !l.exotic);
  return pickFrom(available, rng);
}

/** Resolve every option, filling unset ones from the mode-appropriate pools. */
export function resolveAlienRace(
  options: AlienRaceGeneratorOptions = {},
  rng: Rng = defaultRng,
): ResolvedAlienRace {
  const generationMode = choose(
    options.generationMode,
    alienRaceConfig.generationModes,
    rng,
  );
  return {
    genre: choose(options.genre, alienRaceConfig.genres, rng),
    generationMode,
    homeEnvironment: chooseProfile(
      options.homeEnvironment,
      ENVIRONMENTS,
      generationMode,
      rng,
    ).name,
    bodyPlan: chooseProfile(options.bodyPlan, BODY_PLANS, generationMode, rng)
      .name,
    psychology: choose(options.psychology, alienRaceConfig.psychologies, rng),
    socialOrganisation: choose(
      options.socialOrganisation,
      alienRaceConfig.socialOrganisations,
      rng,
    ),
    technologyLevel: choose(
      options.technologyLevel,
      alienRaceConfig.technologyLevels,
      rng,
    ),
    relationToOutsiders: choose(
      options.relationToOutsiders,
      alienRaceConfig.relationsToOutsiders,
      rng,
    ),
  };
}

/**
 * Generate a complete local draft without network access or vault writes.
 *
 * Sections are assembled from the resolved traits' own `consequence` fields,
 * so the body plan visibly reaches into Technology and Culture, the
 * communication channel into Psychology and Naming Conventions, and the
 * lifespan into Culture and Beliefs — the issue's core principle, enforced
 * structurally rather than left to chance.
 */
export function generateAlienRaceLocal(
  options: AlienRaceGeneratorOptions = {},
  rng: Rng = defaultRng,
): PublicGeneratorOutput {
  const resolved = resolveAlienRace(options, rng);
  const bodyPlan =
    BODY_PLANS.find((b) => b.name === resolved.bodyPlan) ?? BODY_PLANS[0];
  const environment =
    ENVIRONMENTS.find((e) => e.name === resolved.homeEnvironment) ??
    ENVIRONMENTS[0];
  const psychology =
    PSYCHOLOGIES.find((p) => p.name === resolved.psychology) ?? PSYCHOLOGIES[0];
  const relation =
    RELATIONS.find((r) => r.name === resolved.relationToOutsiders) ??
    RELATIONS[0];
  const communication = deriveCommunication(bodyPlan, environment, rng);
  const contingency = pickFrom(CONTINGENCIES, rng);
  const lifespan = deriveLifespan(
    environment,
    bodyPlan,
    resolved.generationMode,
    rng,
  );
  const title = chooseName(options.avoidNames ?? [], rng);

  // Each trait's consequence is spent in exactly one section, so the draft
  // reads as a chain of implications rather than restating the same fragment
  // under several headings.
  const speciality = environment.specialityShort;
  const content = [
    "## Overview",
    `The ${title} are a ${resolved.genre.toLowerCase()} species with ${bodyPlan.detail}, native to ${environment.short}. Their disposition is ${psychology.detail}, they are organised as ${resolved.socialOrganisation.toLowerCase()}, and they currently stand as ${resolved.relationToOutsiders.toLowerCase()} to their neighbours.`,
    "",
    "## Evolutionary Origin",
    `They evolved on ${environment.short}, which selected for ${environment.selectedFor}. That pressure set the constraints they have lived inside ever since — though not everything about them follows from it.`,
    "",
    "## Homeworld & Environment",
    `Their homeworld is ${environment.detail}. Because of it, ${environment.consequence}.`,
    "",
    "## Biology & Lifecycle",
    `Physically they have ${bodyPlan.detail}. They live ${lifespan.detail}; ${lifespan.consequence}.`,
    "",
    "## Senses, Communication & Psychology",
    `They communicate by ${communication.detail}, which means ${communication.consequence}. In practice, ${communication.privacy}. Temperamentally they are ${psychology.detail}: ${psychology.consequence}.`,
    "",
    "## Culture & Social Structure",
    `They organise themselves as ${resolved.socialOrganisation.toLowerCase()}. ${capitalise(lifespan.politics)}. Their body plan shows here too: ${bodyPlan.consequence}. Not all of it comes from their biology, though — ${contingency}.`,
    "",
    "## Technology",
    `At ${article(resolved.technologyLevel)} ${resolved.technologyLevel.toLowerCase()} level, their engineering shows its origins plainly: ${bodyPlan.technology}. Their acknowledged speciality is ${environment.speciality}.`,
    "",
    "## Beliefs & Worldview",
    `${capitalise(psychology.worldview)}. What another species would call faith, they treat as an accurate description of how the world has always behaved for them.`,
    "",
    "## Relations with Outsiders",
    `They are currently ${resolved.relationToOutsiders.toLowerCase()}. The friction is rarely malice: ${relation.friction}.`,
    "",
    "## Internal Factions & Conflicts",
    `One faction holds that their ${speciality} should be traded openly for standing among other species; another argues that dependence is exactly how a species like theirs gets absorbed. Neither side is wrong about the risk.`,
  ].join("\n");

  const lore = [
    "## Weaknesses & Constraints",
    `- ${capitalise(bodyPlan.weakness)}.`,
    `- ${capitalise(environment.constraint)}.`,
    "",
    "## Naming Conventions",
    `${capitalise(communication.naming)}.`,
    "",
    "## Typical Archetypes",
    `- **The Intermediary** — one of the few who can work comfortably with outsiders, and quietly distrusted at home for it.`,
    `- **The Specialist** — trained into their people's speciality, ${speciality}, and worth more abroad than at home.`,
    `- **The Unfitted** — born without the aptitude their people organise themselves around, and living proof that the pattern everyone treats as universal has exceptions.`,
    "",
    "## Adventure Hooks",
    `- A delegation of the ${title} needs an outsider to carry a message their own communication cannot safely encode.`,
    `- Something is exploiting a known weakness of theirs deliberately, and they cannot investigate it without admitting the weakness exists.`,
    `- Their two internal factions are both recruiting the party, and each is telling a partial truth about what the other intends.`,
  ].join("\n");

  return {
    type: "creature",
    title,
    // Leads with what makes them non-human rather than what they look like,
    // matching the rule the AI prompt sets for its own summary.
    summary: `The ${title} are a ${resolved.genre.toLowerCase()} species from ${environment.short}, whose ${communication.summaryPhrase} and ${lifespan.summaryPhrase} make them persistently difficult for other species to read.`,
    content,
    lore,
    labels: [
      "alien-race",
      label(resolved.genre),
      label(resolved.generationMode.split("/")[0]),
      label(resolved.bodyPlan),
      label(resolved.homeEnvironment),
      label(resolved.socialOrganisation),
      label(resolved.technologyLevel),
    ],
    status: "active",
  };
}

/** Build the dedicated AI brief; campaign context is prepended by the registry. */
export function buildAlienRacePrompt(
  options: AlienRaceGeneratorOptions = {},
  rng: Rng = defaultRng,
): AlienRacePrompt {
  const genre = options.genre?.trim() || "science-fiction";
  const generationMode = options.generationMode?.trim() || GROUNDED_MODE;
  // Unset options are listed as an explicit "your choice" rather than being
  // dropped, so the brief always shows the model the full parameter set.
  const UNSET = "your choice";
  const homeEnvironment = options.homeEnvironment?.trim() || UNSET;
  const bodyPlan = options.bodyPlan?.trim() || UNSET;
  const psychology = options.psychology?.trim() || UNSET;
  const socialOrganisation = options.socialOrganisation?.trim() || UNSET;
  const technologyLevel = options.technologyLevel?.trim() || UNSET;
  const relationToOutsiders = options.relationToOutsiders?.trim() || UNSET;

  const extraAvoidedNames = avoidNamesExcludingContext(
    options.avoidNames ?? [],
    options.campaignContext,
  )
    .map((name) => name.trim())
    .filter(Boolean);
  const nameRestrictions = extraAvoidedNames.length
    ? ` Also do not use these campaign-specific names: ${extraAvoidedNames.join(", ")}.`
    : "";

  // A user can reach an exotic trait in Grounded mode by choosing it
  // explicitly (the selects accept custom values, and the in-app registry
  // offers every trait regardless of mode). Blanket-forbidding exotic life in
  // that case would contradict the request line directly above it, so the
  // prohibition carves out whatever they actually asked for.
  const explicitExotic = [
    BODY_PLANS.find(
      (b) =>
        b.exotic &&
        b.name.toLowerCase() === options.bodyPlan?.trim().toLowerCase(),
    )?.name,
    ENVIRONMENTS.find(
      (e) =>
        e.exotic &&
        e.name.toLowerCase() === options.homeEnvironment?.trim().toLowerCase(),
    )?.name,
  ].filter((name): name is string => !!name);

  // Applies to both grounded variants: the plausibility bar is about internal
  // consistency and avoiding howlers, not about writing a physics lecture.
  const groundedRigour =
    ' Keep the physical picture internally consistent: environment, gravity, atmosphere, biology, senses and locomotion must all agree with one another. High gravity implies short, heavily reinforced bodies and a real cost to flight; a thin or exotic atmosphere constrains what respiration, sound and fire can do; a sense only works if its medium exists there — no sight in perpetual darkness, no air-borne scent or sound in vacuum, no unexplained echolocation in a vacuum or awareness with no organ behind it. Avoid obvious scientific mistakes (a species that "evolved to be perfect", eyes on a world with no light, warm-blooded metabolism with no food chain to support it) and avoid unjustified absolutes ("they are immune to all disease", "they never sleep", "they cannot lie", "they always tell the truth") unless you state the mechanism that makes it true and the cost it carries. Prefer "almost always, except…" to "always".';

  const groundedGuidance = explicitExotic.length
    ? `Generation mode is Grounded / Evolutionary, with one deliberate exception: the user explicitly asked for ${explicitExotic.join(" and ")}, which you must keep. Treat that as the single non-standard element and build everything else around it as plausibly as possible — the rest of the species should still be clearly shaped by selection pressure from its environment, and the exception itself must obey a consistent internal logic with the same concrete downstream consequences an ordinary biological trait would have. Do not add further exotic traits beyond the one asked for.${groundedRigour}`
    : `Generation mode is Grounded / Evolutionary: the species must be biologically plausible and clearly shaped by selection pressure from its environment. No crystalline, plasma, energy-based or machine life. Every trait should have an evolutionary reason a xenobiologist could argue for.${groundedRigour}`;

  const modeGuidance = isFreeform(generationMode)
    ? "Generation mode is Freeform / Fantastic: exotic life is permitted — crystalline organisms, colonial swarm minds, plasma structures, self-replicating machine lineages, life with no planetary origin. Exotic does not mean arbitrary: whatever you choose still has to obey its own internal logic consistently, and its strangeness must produce the same concrete downstream consequences a biological trait would."
    : groundedGuidance;

  const genreGuidance =
    genre.toLowerCase() === "cosmic horror"
      ? "For Cosmic Horror, the species' alienness should be genuinely unsettling rather than merely exotic — what makes them frightening is that their priorities are coherent and simply not ours. Avoid making them evil; make them indifferent in a way that has consequences."
      : genre.toLowerCase() === "hard sci-fi"
        ? "For Hard Sci-Fi, keep biology, biochemistry and technology extrapolated from real principles — no unexplained psionics, no biology that violates thermodynamics for convenience."
        : genre.toLowerCase() === "cyberpunk"
          ? "For Cyberpunk, foreground who profits from this species — their labour, their biology, their homeworld's resources — and what augmentation or dependency that has created."
          : genre.toLowerCase() === "post-apocalyptic"
            ? "For Post-Apocalyptic, the species is living after something ended: their technology should be salvaged or inherited rather than understood, and their culture organised around what was lost."
            : "For Space Opera, the species should slot into a populated interstellar setting — give them a clear niche, a reputation, and a stake in someone else's politics.";

  return {
    systemInstruction:
      "You are a xenobiologist and worldbuilder designing a coherent alien species for a tabletop RPG campaign. Build the species around one strong Core Alien Concept, and hold to one defining constraint: consequence. Every biological and environmental trait you establish must visibly change something else about the species — a trait that changes nothing is decoration, not biology. Never write a species that is humans with unusual appearances, and never write one that agrees with itself about everything. Return only one valid JSON object.",
    userMessage: withPublicCreativeCue(
      `Create a ${genre} alien species from these starting parameters:
- Home environment: ${homeEnvironment}
- Body plan: ${bodyPlan}
- Psychology: ${psychology}
- Social organisation: ${socialOrganisation}
- Technology level: ${technologyLevel}
- Relationship to other species: ${relationToOutsiders}
${formatCampaignContextBlock(options.campaignContext)}

${modeGuidance}

${genreGuidance}

Return JSON with "title", "summary", "labels", "connections", a markdown "content" field, and a markdown "lore" field. "title" is the species' own name for itself. "summary" must describe the species as a whole in one sentence, leading with what makes them genuinely non-human rather than what they look like.

"content" must use these exact sections:
## Overview
## Evolutionary Origin
## Homeworld & Environment
## Biology & Lifecycle
## Senses, Communication & Psychology
## Culture & Social Structure
## Technology
## Beliefs & Worldview
## Relations with Outsiders
## Internal Factions & Conflicts

"lore" must use these exact sections:
## Weaknesses & Constraints
## Naming Conventions
## Typical Archetypes
## Adventure Hooks

Give the species one **Core Alien Concept**: a single striking central idea that makes them memorable and that other species find genuinely hard to accommodate. It should be the thing a GM still remembers a week later — a way of being alive, thinking, or relating to others that has no clean human equivalent. Introduce it in "## Overview" and carry it visibly through at least three other sections, including at least one of "## Culture & Social Structure" or "## Beliefs & Worldview". Commit to that one idea and follow it all the way through rather than scattering the strangeness across a dozen mild quirks.

But the Core Alien Concept must not become the explanation for everything. It is the species' most distinctive feature, not a skeleton key: resist the urge to answer every question about them with it. Show its limits — at least one meaningful exception, contradiction, subculture, or named kind of individual who does not fit the dominant pattern, and at least one part of their life it simply does not govern. A species whose every institution, belief and habit reduces to one idea reads as a thought experiment rather than a people.

The single most important rule: **every major biological or environmental difference must have consequences elsewhere in the species design.** A trait that appears in "## Biology & Lifecycle" and nowhere else is a failure. Each major trait must visibly shape at least two of: their culture, technology, architecture, psychology, law, communication, or the ordinary texture of daily life. Purely cosmetic differences — unusual colouring, an extra pair of eyes, decorative crests, a striking silhouette — do not count as alien traits at all: if a trait changes nothing about how they live, either give it consequences or leave it out. Concretely — six limbs must change their tools, their architecture, or a social concept they have that we do not; chemical or broadcast communication must change what privacy, secrecy and deception mean to them, and therefore how their law and their conspiracies work; an extreme lifespan must change their politics, inheritance, and how their institutions retain memory; a hostile home environment must show up in their technological speciality and in what they consider basic hospitality or basic decency. "## Technology" must explicitly reflect the body plan and the homeworld, not describe generic technology at the stated level. "## Weaknesses & Constraints" must follow from the biology you actually described rather than being a list of unrelated vulnerabilities, and at least one weakness must be something the species cannot simply engineer around. "## Naming Conventions" must be consistent with how they communicate — a species that signals chemically or by light does not have names that survive being spoken aloud unchanged. "## Typical Archetypes" must be roles that only make sense for this species, not portable fantasy classes, and at least one of them must be someone who does not fit the dominant pattern — an outlier, a defector, a failure by their own people's standards, or someone the Core Alien Concept does not work for. "## Adventure Hooks" must contain at least three playable hooks that each depend on something specific to this species — a hook that would work equally well for any other species is a failure.

**Biology shapes; it does not determine.** The rule above says every major trait must have consequences — it does not say consequences are the only thing culture is made of. Biology and environment set the pressures and the constraints; history, geography, institutions, technological accidents, competing material interests, and inherited tradition do the rest. Do not derive an entire civilisation from one adaptation. Between "## Culture & Social Structure" and "## Beliefs & Worldview", at least one major cultural feature must come from somewhere other than biology and be stated as such: a specific historical event that went the way it did contingently, a geographic accident, an institution that outlived its original purpose, a technology adopted for one reason and kept for another, a rivalry between groups with different material interests, or a tradition whose original reason nobody remembers. Their history should contain at least one thing that could plausibly have gone another way.

**Vary the template.** Alien species written to a formula are worse than ordinary ones. Vary political structure, ethics, religion, economic system, and attitudes to individuality, conflict, privacy, property and family — and make sure at least one of those is genuinely unexpected for a species with this biology. In particular, do not reach for these defaults unless the specific parameters really compel it: guild or artisan-collective societies; morality derived from efficiency, optimisation or resource-thrift; religions built on entropy, heat-death or thermodynamics, and more generally a secular physics-derived philosophy standing in for belief; a communal or hive identity used as shorthand for "alien"; a biological inability to lie; hereditary castes, ranks or role-locked birth classes used as the social structure; a communication method that is a non-spoken signal channel — scent, pheromone, colour, light, vibration, field — and the scent-string or light-pattern names that follow from it; and factions split along a conservative-versus-reformer axis. If you find yourself writing one of those, choose something else. A species may still communicate by a non-spoken channel where its biology and environment genuinely compel it — but reach for that because this species requires it, not because it is the easy way to make a species read as alien; a spoken, written, gestural or tactile language is available and is usually the fresher choice. The internal disagreement asked for below must be about something specific to this species and its situation, not a generic old-guard-versus-progressives split.

**Do not write a monoculture.** A species that agrees with itself has no story in it. "## Internal Factions & Conflicts" must present at least two positions with defensible reasoning, and at least one of them must challenge a foundational cultural assumption — a faction, subculture, generation or reform movement that rejects something the rest of the species treats as simply how things are, up to and including the Core Alien Concept itself. Never write "all of them believe" or "every one of them does" as if the species were of one mind; where a belief really is near-universal, say who the exceptions are and what it costs them. Keep the species politically ambiguous: "## Relations with Outsiders" must make their friction with other species legible as a difference in priorities rather than villainy. Labels must match the actual generated content.

${NAME_BAN_PROMPT}${nameRestrictions}

Before returning, run a consistency pass: confirm the body plan you described in "## Biology & Lifecycle" is visibly reflected in "## Technology" (tools, architecture, or movement) and in at least one social concept in "## Culture & Social Structure"; confirm the communication method drives what "## Senses, Communication & Psychology" says about privacy or deception and matches "## Naming Conventions"; confirm the lifespan you established governs what "## Culture & Social Structure" says about inheritance, succession, or institutional memory; confirm the home environment is reflected in the technological speciality named in "## Technology" and in at least one entry under "## Weaknesses & Constraints"; confirm every weakness follows from a trait you actually described rather than being unrelated; confirm each of the three adventure hooks depends on a specific trait of this species and would not work unchanged for a generic species; confirm neither internal faction nor the species itself is written as simply villainous; confirm the Core Alien Concept is introduced in "## Overview" and visibly carried through at least three other sections, and that it is nonetheless not used to explain everything — there is a stated exception, contradiction or subculture it does not cover, and an archetype who does not fit; confirm at least one major cultural feature comes from history, geography, an institution, a technological accident, competing interests or inherited tradition rather than from biology, and is stated as such; confirm you have not reached for guild societies, efficiency-as-morality, entropy religions or physics-as-philosophy, communal identity, an inability to lie, hereditary castes, a non-spoken signal channel as the communication method, or a conservative-versus-reformer split unless the parameters genuinely forced it; confirm no major trait is purely cosmetic; confirm "## Internal Factions & Conflicts" contains at least one faction or subculture challenging a foundational cultural assumption, and that nothing in the draft describes the species as uniformly agreeing about anything without naming the exceptions;${
        isFreeform(generationMode)
          ? ""
          : " confirm the physical picture holds together — environment, gravity, atmosphere, biology, senses and locomotion agreeing with one another, no sense without a medium to carry it, and no unjustified absolute stated without its mechanism and its cost;"
      } and then apply the final test: **could this species be swapped for humans without changing the setting?** Read the draft as if every alien detail were merely decorative and ask whether the culture, technology, politics and hooks would still work unchanged. If they would, the species is not doing any work — go back and make its biology, psychology, lifecycle or environment matter more, changing at least one concrete thing about how it lives, builds or decides, until the answer is clearly no. Quietly correct anything that fails, then return only the corrected final JSON.`,
      "creature",
      rng,
    ),
  };
}

/** Parse an AI alien race draft into the public generator output contract. */
export function parseAlienRaceResponse(
  text: string,
  avoidNames: readonly string[] = [],
): PublicGeneratorOutput {
  const data = parseFencedJson<{
    title?: unknown;
    summary?: unknown;
    content?: unknown;
    lore?: unknown;
    labels?: unknown;
  }>(text);

  if (typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("Alien race response is missing a title.");
  }
  if (typeof data.lore !== "string" || !data.lore.trim()) {
    throw new Error("Alien race response is missing lore.");
  }
  // "content" carries ten of the fourteen sections and is the whole main
  // column. Returning "" for a missing one would render a near-empty draft;
  // throwing lets runWithAIFallback drop to the local tables instead.
  if (typeof data.content !== "string" || !data.content.trim()) {
    throw new Error("Alien race response is missing content.");
  }
  const forbidden = new Set(
    [...BANNED_NAMES, ...avoidNames].map((name) => name.trim().toLowerCase()),
  );
  if (forbidden.has(data.title.trim().toLowerCase())) {
    throw new Error("Alien race response uses a banned title.");
  }

  const labels = [
    "alien-race",
    ...(Array.isArray(data.labels)
      ? data.labels.filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
      : []),
  ].filter((item, index, all) => all.indexOf(item) === index);

  return {
    type: "creature",
    title: data.title.trim(),
    summary: typeof data.summary === "string" ? sanitizeText(data.summary) : "",
    content: sanitizeText(data.content.trim()),
    lore: sanitizeText(data.lore.trim()),
    labels,
    status: "active",
  };
}
