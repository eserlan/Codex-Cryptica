/**
 * Thematically-keyed progress loading messages for generator UI.
 * Gives user fun, genre-specific progress feedback while AI runs.
 */

export const THEME_LOADING_MESSAGES: Record<string, string[]> = {
  Fantasy: [
    "Deciphering ancient runes in forgotten libraries...",
    "Consulting guildhall contract boards...",
    "Distilling alchemical rumors in tavern basements...",
    "Mapping shadow-grove ley lines...",
    "Bribing goblin informants for entrance keys...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Classic Fantasy": [
    "Deciphering ancient runes in forgotten libraries...",
    "Consulting guildhall contract boards...",
    "Distilling alchemical rumors in tavern basements...",
    "Mapping shadow-grove ley lines...",
    "Bribing goblin informants for entrance keys...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Cyberpunk: [
    "Decrypting encrypted comms feeds...",
    "Infiltrating corporate subnet nodes...",
    "Splicing black-market ICE icebreakers...",
    "Bribing street fixers in neon back-alleys...",
    "Scanning orbital payload manifests...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Gothic Horror": [
    "Unsealing iron-welded mausoleum doors...",
    "Reading diary entries stained with old wax...",
    "Tracking carriage tracks into the lingering fog...",
    "Deciphering cathedral crypt inscriptions...",
    "Bribing sanitarium orderlies for patient logs...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Cosmic Horror": [
    "Comparing impossible star charts...",
    "Cataloguing water-damaged expedition journals...",
    "Tracing a signal beneath the continental shelf...",
    "Cross-referencing restricted university archives...",
    "Measuring angles that should not meet...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Lancer: [
    "Calibrating sub-light orbital sensors...",
    "Parsing NHP cascade telemetry logs...",
    "Intercepting mercenary tactical dispatches...",
    "Scanning zero-g shipyard choke points...",
    "Hacker-pinging contested blink-stations...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Modern Conspiracy": [
    "Redacting classified black-budget files...",
    "Intercepting wiretapped phone transcripts...",
    "Tracing shell company offshore wire transfers...",
    "Deciphering corrupted bio-lab server drives...",
    "Tailing unmarked surveillance vans...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Optimistic Sci-Fi": [
    "Translating multi-species alien dialect signals...",
    "Cataloging bio-dome flora samples...",
    "Synthesizing diplomatic consensus protocols...",
    "Mapping binary star orbital vectors...",
    "Calibrating deep-space array transceivers...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Pirate: [
    "Deciphering water-damaged treasure charts...",
    "Eavesdropping in free-port rum taverns...",
    "Calculating six-minute low-tide windows...",
    "Inspecting merchant vessel cargo manifests...",
    "Interrogating sea-fort harbor masters...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Post-Apocalyptic": [
    "Testing water samples for rad-contamination...",
    "Scavenging pre-collapse server hard drives...",
    "Scanning shortwave radio broadcasts across the wasteland...",
    "Mapping caravan trade routes through dead cities...",
    "Bribing scrap-bazaar merchants for filter parts...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Sci-Fi": [
    "Analyzing flight recorder audio logs...",
    "Scanning sub-surface moon research platforms...",
    "Decrypting automated distress transponders...",
    "Calculating orbital decay window vectors...",
    "Probing derelict hull pressure breaches...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Space Opera": [
    "Transmitting encrypted code-phrases to cell contacts...",
    "Hacking imperial prison barge manifests...",
    "Scouting asteroid base starfighter hangars...",
    "Dodging planetary curfew patrol sweeps...",
    "Verifying defector credentials before rendezvous...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Steampunk: [
    "Checking steam-pressure gauge readouts...",
    "Inspecting clockwork syndicate patent vaults...",
    "Tracing aetheric fuel pipeline leakages...",
    "Bribing pressure-wrights' guild apprentices...",
    "Navigating brass governor hall galleries...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Vampire: [
    "Auditing night-court tribunal registry lists...",
    "Browsing blood-bank shipment manifests...",
    "Attending high-society masquerade balls disguised...",
    "Exposing broken covenant documents...",
    "Infiltrating sun-less penthouse suites...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  Western: [
    "Reading wanted posters outside the sheriff's office...",
    "Eavesdropping on dust-covered saloon gambling tables...",
    "Tracking wagon ruts into dry canyon passes...",
    "Inspecting assay office land deeds...",
    "Interrogating telegraph office operators...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
  "Dark Fantasy": [
    "Examining plague pit gibbet markings...",
    "Consulting witch-hunter inquisitor records...",
    "Navigating sunken cathedral catacombs...",
    "Deciphering blighted blood-oath scrolls...",
    "Bribing grave-digger guild masters...",
    "Weaving situation network threads...",
    "Calibrating dynamic primary and secondary stakes...",
  ],
};

const NORMALIZED_THEME_MAP: Record<string, string> = {
  fantasy: "Fantasy",
  "classic fantasy": "Fantasy",
  cyberpunk: "Cyberpunk",
  gothic: "Gothic Horror",
  "gothic horror": "Gothic Horror",
  "gothic-horror": "Gothic Horror",
  "cosmic horror": "Cosmic Horror",
  "cosmic-horror": "Cosmic Horror",
  cosmic_horror: "Cosmic Horror",
  lancer: "Lancer",
  conspiracy: "Modern Conspiracy",
  "modern conspiracy": "Modern Conspiracy",
  "modern-conspiracy": "Modern Conspiracy",
  "optimistic scifi": "Optimistic Sci-Fi",
  "optimistic sci-fi": "Optimistic Sci-Fi",
  "optimistic-scifi": "Optimistic Sci-Fi",
  pirate: "Pirate",
  "pirate & high seas": "Pirate",
  "post apoc": "Post-Apocalyptic",
  "post-apoc": "Post-Apocalyptic",
  "post-apocalyptic": "Post-Apocalyptic",
  scifi: "Sci-Fi",
  "sci-fi": "Sci-Fi",
  "space opera": "Space Opera",
  "space-opera": "Space Opera",
  "space-opera-resistance": "Space Opera",
  steampunk: "Steampunk",
  vampire: "Vampire",
  western: "Western",
  "dark fantasy": "Dark Fantasy",
  "dark-fantasy": "Dark Fantasy",
};

const DEFAULT_MESSAGES = [
  "Building situation network threads...",
  "Calibrating primary and secondary pressures...",
  "Interconnecting key locations and NPCs...",
  "Drafting non-linear world end-states...",
  "Polishing clues and secrets...",
];

/**
 * Get a list of thematic loading progress messages for a given genre or theme label.
 */
export function getThemeLoadingMessages(genreOrTheme?: string): string[] {
  if (!genreOrTheme) return DEFAULT_MESSAGES;
  const key = genreOrTheme.trim().toLowerCase();
  const resolvedGenre = NORMALIZED_THEME_MAP[key] ?? genreOrTheme;
  return (
    THEME_LOADING_MESSAGES[resolvedGenre] ??
    THEME_LOADING_MESSAGES[genreOrTheme] ??
    THEME_LOADING_MESSAGES[genreOrTheme.replace(/^Classic /, "")] ??
    THEME_LOADING_MESSAGES[genreOrTheme.replace(/ \/ .*/, "")] ??
    DEFAULT_MESSAGES
  );
}
