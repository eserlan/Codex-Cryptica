/**
 * Shared constants for the Council Vote generator.
 * Used by both the public SEO surface and the in-vault AI generator.
 */

export const councilVoteConfig = {
  bodyTypes: [
    "Town Council",
    "Noble Court",
    "Senate",
    "Clan Moot",
    "War Council",
    "Corporate Board",
    "Revolutionary Committee",
    "Interstellar Assembly",
    "Criminal Syndicate",
    "Religious Conclave",
  ],
  bodyTypesByTheme: {
    "Classic Fantasy": [
      "Town Council",
      "Noble Court",
      "Senate",
      "Religious Conclave",
    ],
    Pirate: ["Clan Moot", "Criminal Syndicate", "War Council", "Noble Court"],
    "Cyberpunk / Corporate": [
      "Corporate Board",
      "Revolutionary Committee",
      "Criminal Syndicate",
      "Senate",
    ],
    "Vampire / Gothic Noir": [
      "Noble Court",
      "Religious Conclave",
      "Criminal Syndicate",
      "Clan Moot",
    ],
    "Cosmic Horror": [
      "Religious Conclave",
      "Senate",
      "Town Council",
      "Noble Court",
    ],
    "Sci-Fi / Space Opera": [
      "Interstellar Assembly",
      "Senate",
      "Corporate Board",
      "War Council",
    ],
    "Modern Conspiracy": [
      "Senate",
      "Corporate Board",
      "Revolutionary Committee",
      "Criminal Syndicate",
    ],
    "Post-Apocalyptic": [
      "War Council",
      "Clan Moot",
      "Criminal Syndicate",
      "Town Council",
    ],
    "Western / Frontier": [
      "Town Council",
      "War Council",
      "Criminal Syndicate",
      "Noble Court",
    ],
    Steampunk: [
      "Corporate Board",
      "Senate",
      "Noble Court",
      "Revolutionary Committee",
    ],
    Lancer: [
      "Interstellar Assembly",
      "War Council",
      "Corporate Board",
      "Senate",
    ],
    "Space Opera Resistance": [
      "Revolutionary Committee",
      "War Council",
      "Interstellar Assembly",
      "Clan Moot",
    ],
    "Optimistic Exploration Sci-Fi": [
      "Interstellar Assembly",
      "Senate",
      "Corporate Board",
      "Town Council",
    ],
  } as Record<string, string[]>,
  sizes: ["3", "5", "7", "9"],
  votingRules: [
    "Simple Majority",
    "Supermajority (Two-Thirds)",
    "Unanimous",
    "Veto Power",
    "Secret Ballot",
  ],
  scopes: ["Single Location", "Distributed Across Settlements/Regions"],
  tones: ["Political", "Tense", "Desperate", "Farcical", "Somber", "Hopeful"],
  antagonistInfluences: ["None", "Subtle", "Entrenched", "Dominant"],
  archetypes: [
    "Beleaguered Ally",
    "Villain's Toady",
    "Greedy Broker",
    "Loyal Shadow",
    "Traditionalist",
    "Idealist",
    "Wildcard",
  ],
  stances: ["Support", "Oppose", "Leaning", "Unknown"],
  persuasionHints: {
    "Beleaguered Ally":
      "already sympathetic, but needs political cover: a face-saving concession or public reassurance would lock in this vote",
    "Villain's Toady":
      "loyal only as long as it pays: a better offer, or exposing what they owe their patron, could flip this vote",
    "Greedy Broker":
      "purely transactional: the right bribe, contract, or cut of the outcome moves this vote",
    "Loyal Shadow":
      "votes however their patron directs: change the patron's mind, or sever that loyalty, and the vote follows",
    Traditionalist:
      "distrusts anything that breaks precedent: frame the proposal as continuity, or cite an old precedent, to bring them around",
    Idealist:
      "genuinely persuadable by principle: a compelling moral argument or proof of who truly benefits could win this vote",
    Wildcard:
      "unpredictable and hard to read: something personal, not political, is what will actually move this vote",
  } as Record<string, string>,
};
