/**
 * A small, Codex-native vocabulary of familiar narrative patterns for
 * tabletop and worldbuilding premises (#3466). It names the shape a premise
 * is using so a later pass can talk about expectations and ways to
 * complicate them. Familiar is not a flaw: most good premises are built
 * from patterns like these, and nothing here scores originality.
 *
 * Written for Codex Cryptica; not drawn from any external trope catalogue.
 */

export type NarrativePatternFamily =
  "reveal" | "character" | "faction" | "situation" | "structure";

export interface NarrativePattern {
  id: string;
  name: string;
  family: NarrativePatternFamily;
  /** One line describing the shape, for the classifier. */
  shape: string;
  /** What players or readers will start to anticipate once they see it. */
  expectation: string;
  /** Ways to complicate the pattern without discarding it. */
  levers: readonly string[];
}

const pattern = (
  id: string,
  name: string,
  family: NarrativePatternFamily,
  shape: string,
  expectation: string,
  levers: readonly string[],
): NarrativePattern => ({ id, name, family, shape, expectation, levers });

export const NARRATIVE_PATTERNS: readonly NarrativePattern[] = [
  pattern(
    "truth-behind-the-legend",
    "Truth Behind the Legend",
    "reveal",
    "A story everyone accepts turns out to hide a different, often uncomfortable, account.",
    "The hidden account will be uncovered and will overturn who is trusted.",
    [
      "Let the legend be partly true, so neither version is clean.",
      "Make someone sympathetic depend on the legend staying believed.",
    ],
  ),
  pattern(
    "villain-has-better-evidence",
    "Villain Has the Better Evidence",
    "reveal",
    "The apparent antagonist is acting on facts the heroes lack or refuse to see.",
    "The heroes will learn the facts and face whether to change sides.",
    [
      "Make the antagonist right about the problem but wrong about the cure.",
      "Show the evidence early and let the cost of acting on it drive play.",
    ],
  ),
  pattern(
    "misunderstood-monster",
    "Misunderstood Monster",
    "reveal",
    "A feared creature or outsider is not the threat it appears to be.",
    "Fear will give way to understanding, and the real threat will surface.",
    [
      "Keep the creature genuinely dangerous even after it is understood.",
      "Give the people who feared it a reasonable cause to keep fearing it.",
    ],
  ),
  pattern(
    "false-patron",
    "False Patron",
    "reveal",
    "Whoever hires, shelters or funds the protagonists is quietly the problem.",
    "The patron's motives will be exposed, turning the job against them.",
    [
      "Make the patron's goal defensible even if the method is not.",
      "Tie the protagonists' reward or safety to the patron succeeding.",
    ],
  ),
  pattern(
    "rot-at-the-top",
    "Rot at the Top",
    "reveal",
    "Legitimate authority, such as a ruler, council or church, is the source of the harm.",
    "The authority will be confronted, deposed or exposed.",
    [
      "Make the authority's fall dangerous to the people it was harming.",
      "Give the authority loyal, decent servants who are not complicit.",
    ],
  ),
  pattern(
    "prophecy-trap",
    "Prophecy Trap",
    "reveal",
    "A prediction shapes events, and acting on or against it helps fulfil it.",
    "The prophecy will come true in an unexpected, ironic way.",
    [
      "Let rival groups read the same prophecy differently and act on it.",
      "Reveal who benefits from people believing the prophecy.",
    ],
  ),
  pattern(
    "ancient-infrastructure",
    "Ancient Infrastructure Mistaken for Magic",
    "reveal",
    "Something treated as miracle, curse or nature is an old built system still running.",
    "Someone will learn how the system works and gain or break control of it.",
    [
      "Make the system essential, so repairing or stopping it both cost something.",
      "Give the people who tend it rituals that are wrong but still work.",
    ],
  ),
  pattern(
    "hidden-heir",
    "Hidden Heir",
    "reveal",
    "An overlooked person has a hidden claim to power, a bloodline or a legacy.",
    "The claim will be revealed and contested at a decisive moment.",
    [
      "Make the heir not want the claim, or make the claim illegitimate.",
      "Let several people believe they are the heir.",
    ],
  ),
  pattern(
    "sealed-thing-stirring",
    "Sealed Thing Stirring",
    "situation",
    "Something dangerous was bound or buried long ago, and the binding is weakening.",
    "It will break free unless the binding is renewed, usually at a cost.",
    [
      "Make renewing the seal require something the community now refuses to give.",
      "Let the sealed thing have been wronged by whoever sealed it.",
    ],
  ),
  pattern(
    "living-off-the-beast",
    "Living Off the Beast",
    "situation",
    "A community's wealth or survival depends on a dangerous, sacred or finite source.",
    "The source will run out, fight back, or prove to be something other than assumed.",
    [
      "Make the people who profit most also the ones best placed to fix it.",
      "Give ordinary residents a reason to defend the trade.",
    ],
  ),
  pattern(
    "the-town-keeps-a-secret",
    "The Town Keeps a Secret",
    "situation",
    "An isolated community shares something it hides from outsiders.",
    "Outsiders will uncover the secret, and the community will close ranks.",
    [
      "Make the secret protective rather than sinister, at least at first.",
      "Split the community over whether to keep hiding it.",
    ],
  ),
  pattern(
    "safe-haven-falls",
    "Safe Haven Falls",
    "situation",
    "A place of shelter is under threat or is about to be lost.",
    "The haven will be breached, and its people will scatter or make a last stand.",
    [
      "Make the threat come partly from inside the haven.",
      "Force a choice about who the haven can still protect.",
    ],
  ),
  pattern(
    "dwindling-lifeline",
    "Dwindling Lifeline",
    "situation",
    "A resource that keeps people alive is running out.",
    "Rationing will breed conflict, and someone will hoard or steal it.",
    [
      "Give the protagonists privileged access, so fairness costs them.",
      "Make the replacement worse in a way only some people can see.",
    ],
  ),
  pattern(
    "forbidden-zone",
    "Forbidden Zone",
    "situation",
    "A place is off-limits by law, fear or taboo, and someone needs to go in.",
    "Entering will reveal why it was forbidden.",
    [
      "Make the reason for the ban partly false and partly justified.",
      "Let something leave the zone instead of the protagonists entering it.",
    ],
  ),
  pattern(
    "disgraced-champion",
    "Disgraced Champion",
    "character",
    "A once-honoured protector has lost standing and seeks, or avoids, redemption.",
    "The disgrace will prove unjust or the champion will earn their way back.",
    [
      "Make the disgrace deserved, and the redemption something other than reinstatement.",
      "Tie the disgrace to a choice the champion would make again.",
    ],
  ),
  pattern(
    "reluctant-champion",
    "Reluctant Champion",
    "character",
    "Someone with no wish to lead or fight is pushed into the role.",
    "They will accept the role after a refusal and a turning point.",
    [
      "Make their refusal reasonable and costly to override.",
      "Let them succeed by doing the job differently from a willing hero.",
    ],
  ),
  pattern(
    "mentor-with-a-secret",
    "Mentor With a Secret",
    "character",
    "A guide or teacher is concealing something that changes their advice.",
    "The secret will come out at the worst possible moment.",
    [
      "Make the secret something the mentor is protecting the protagonists from.",
      "Let the protagonists learn it early and decide whether to say so.",
    ],
  ),
  pattern(
    "enemy-within",
    "Enemy Within",
    "character",
    "Someone inside the group or community is working against it.",
    "The traitor will be unmasked, probably someone trusted.",
    [
      "Give the traitor a cause the group would sympathise with.",
      "Let more than one person be hiding something unrelated.",
    ],
  ),
  pattern(
    "enemy-of-my-enemy",
    "Enemy of My Enemy",
    "faction",
    "Opponents must cooperate against a shared, larger threat.",
    "The alliance will strain and break once the shared threat recedes.",
    [
      "Make each side need the other to betray them eventually.",
      "Let the shared threat be something one side helped create.",
    ],
  ),
  pattern(
    "faction-schism",
    "Faction Schism",
    "faction",
    "A group splits over doctrine, leadership or a single decision.",
    "Each side will seek outside help, and one will try to claim the whole.",
    [
      "Make both sides partly right about the decision that split them.",
      "Give the protagonists friends on both sides.",
    ],
  ),
  pattern(
    "fragile-truce",
    "Fragile Truce",
    "faction",
    "Former enemies hold a peace that one incident could break.",
    "Someone will provoke the incident, and the truce will collapse.",
    [
      "Make the people who want war the ones who suffered most from it.",
      "Let the truce depend on a lie both sides maintain.",
    ],
  ),
  pattern(
    "convenient-scapegoat",
    "Convenient Scapegoat",
    "faction",
    "An outsider or minority is blamed for a problem they did not cause.",
    "The real cause will emerge and the blamers will be shamed.",
    [
      "Make the scapegoats partly involved, just not in the way alleged.",
      "Show who gains from the blame and what clearing it would cost them.",
    ],
  ),
  pattern(
    "empty-throne",
    "Empty Throne",
    "structure",
    "A seat of power has fallen vacant and several parties move to fill it.",
    "A contest will escalate until one claimant wins or the seat is abolished.",
    [
      "Make the best claimant the one nobody wants.",
      "Let the vacancy itself be deliberate.",
    ],
  ),
  pattern(
    "ticking-clock",
    "Ticking Clock",
    "structure",
    "A deadline forces action before a known event or collapse.",
    "The clock will run down to the final moment.",
    [
      "Let the protagonists choose which of two clocks to beat.",
      "Make stopping the clock possible but costly to someone present.",
    ],
  ),
];

const BY_ID = new Map(NARRATIVE_PATTERNS.map((p) => [p.id, p]));

export function getNarrativePattern(id: string): NarrativePattern | undefined {
  return BY_ID.get(id);
}

/** The taxonomy as compact prompt lines: `id | name | shape`. */
export function formatPatternCatalogue(
  patterns: readonly NarrativePattern[] = NARRATIVE_PATTERNS,
): string {
  return patterns.map((p) => `- ${p.id} | ${p.name} | ${p.shape}`).join("\n");
}
