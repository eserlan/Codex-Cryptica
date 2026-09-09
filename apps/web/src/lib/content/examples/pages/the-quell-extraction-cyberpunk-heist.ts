import type { ExampleConfigInput } from "../schema";

/**
 * Source: issue #2850 (heist cluster expansion). Generated directly through
 * the production heist generator for this content pass, not sourced from a
 * community discussion. Reformatted into the example page's block structure
 * and given editorial headings; the generated text itself is unaltered aside
 * from British spelling of two words ("recognises", "colour"-family terms
 * were not present, but "recognizes" was corrected).
 */
export const theQuellExtraction: ExampleConfigInput = {
  slug: "the-quell-extraction-cyberpunk-heist",
  name: "The Quell Extraction",
  title: "Cyberpunk heist example: The Quell Extraction",
  kind: "heist",
  genre: "Cyberpunk / Corporate",
  theme: "cyberpunk",
  summary:
    "Extracting an injured whistleblower compliance architect from a corporate penthouse before a twelve-minute custody roll call, with a cancelled ambulance transponder and two crew members forced to support her every step.",
  provenance: "lightly-edited",
  provenanceNote:
    "Generated directly through the heist generator for this content pass rather than pulled from a community discussion. The generated text is unaltered aside from correcting one American spelling to British English; only headings and block structure were added to fit the example page format.",
  generator: { name: "Heist generator", href: "/generators/heist" },
  context: [
    { label: "Theme", value: "Cyberpunk / Corporate" },
    { label: "Heist Type", value: "Extraction" },
    { label: "Target Type", value: "Corporate Custody Penthouse" },
    { label: "Target Scale", value: "Major" },
    { label: "Subject", value: "Imani Quell and her whistleblower archive" },
  ],
  image: {
    src: "https://assets.codexcryptica.com/announcements/heist-the-quell-extraction.jpg",
    alt: "A corporate penthouse balcony at night above a neon-lit cyberpunk city skyline, a medical transport drone waiting with its hatch open",
  },
  output: [
    {
      kind: "list",
      heading: "GM Quick Reference",
      items: [
        {
          term: "Objective",
          text: "Extract Quell with her whistleblower archive, avoid delivering her to any government agency, and get Quell and the crew clear before the twelve-minute roll call confirms her absence.",
        },
        {
          term: "Primary obstacle",
          text: "Her spinal injury makes every supported movement slow and conspicuous; two crew members must support her until the ambulance drone or another suitable transport carries her.",
        },
        {
          term: "Hidden factor",
          text: "The ambulance transponder is valid but tied to a cancelled patient record.",
        },
        {
          term: "Point of no return",
          text: "Beginning the supported crossing activates the movement pressure.",
        },
        {
          term: "Pressure",
          text: "Each three minutes of movement adds another exposed stretch while patrols keep their schedule; it advances only when three minutes of supported movement pass.",
        },
        {
          term: "Default complication",
          text: "Quell refuses a handover when the crew threatens her archive or autonomy.",
        },
        {
          term: "Escape problem",
          text: "The west balcony remains viable until its transponder audit fails; lockdown also seals it after confirmed detection.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Score",
      paragraphs: [
        "Extract injured executive Imani Quell from Helix Meridian's penthouse, keep her whistleblower archive with her, avoid delivering her to any government agency, and get both Quell and the crew clear through an available route before the next roll call confirms her absence. The crew arrives with a corporate ambulance drone capable of carrying Quell once they reach an approved transfer point.",
      ],
    },
    {
      kind: "prose",
      heading: "The Subject",
      paragraphs: [
        "Imani Quell is a senior compliance architect held in the penthouse after exposing falsified casualty reports. Her spinal brace prevents her from walking far or quickly without support, so two crew members must support her weight until she reaches a transport aid. She will leave only if the crew protects her whistleblower archive and avoids handing her to a government agency. Helix Meridian's executive protection team watches her through cameras, biometrics, and scheduled welfare checks. If she is absent at the twelve-minute roll call, the custody system marks her escaped, dispatches response teams, and revokes ordinary transit permissions. The crew can bypass the routine by disguising her as a sedated executive transfer, persuading her assigned medic to alter the handover, or routing her through the penthouse's maintenance lift during sensor recalibration.",
      ],
    },
    {
      kind: "list",
      heading: "The Catch and the Pressure",
      items: [
        {
          term: "The catch",
          text: "Her spinal brace leaves her unable to cross more than a short distance without two crew members supporting her weight.",
        },
        {
          term: "Pressure",
          text: "Once the crew starts moving her, every three minutes spent supporting her consumes another exposed stretch; each stretch calls for a patrol intersection or forced pause, but does not itself raise the alarm.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Casing the Target",
      items: [
        {
          term: "Entry vector",
          text: "A corporate ambulance drone can dock at the west emergency balcony, but its transponder must be accepted by the perimeter gate.",
        },
        {
          term: "Supervised routine",
          text: "Quell receives medication, a biometric scan, and a private compliance interview in that order; the current medication cycle ends three minutes after the operation begins.",
        },
        {
          term: "Roll-call schedule",
          text: "The custody ledger polls her wrist implant exactly twelve minutes after the operation begins; this is the next roll call.",
        },
        {
          term: "Balcony timing",
          text: "The west balcony remains open until a transponder audit fails; a failed audit immediately seals the dock, while no audit occurs merely because Quell leaves custody.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "The Hidden Factor",
      paragraphs: [
        "The crew's intel says the ambulance transponder is cleared for Quell, but Helix cancelled that patient record after scheduling her to a black-site clinic. When the perimeter gate requests destination confirmation, deception, social leverage, or the maintenance route remains viable. A failed transponder audit seals the west dock immediately; it does not occur automatically when the objective is completed.",
      ],
    },
    {
      kind: "list",
      heading: "Security Rings",
      items: [
        {
          term: "Perimeter",
          text: "The tower screens vehicle identity, flight path, and patient records before opening the emergency balcony. The crew can spoof a live destination through a corporate dispatch relay, bribe the balcony dispatcher, or approach through the storm-drain maintenance conduit during its automated wash cycle.",
        },
        {
          term: "Access",
          text: "Elevators require a current executive escort token, while cameras compare movement patterns against Quell's custody schedule. The crew can steal the medic's credentials, have the medic alter the handover, or use recalibration to cross camera blind spots through the maintenance lift.",
        },
        {
          term: "Custody Floor",
          text: "Two protection officers, a welfare camera, and Quell's wrist implant confirm that she remains in the penthouse suite. The crew can impersonate the compliance interview team, blackmail one officer with casualty-report evidence, or make the camera accept a prerecorded biometric loop while physically moving through the service corridor. A successful loop remains valid until security restores or replaces that camera.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Complications",
      items: [
        {
          term: "Quell refuses (default)",
          text: "She stops cooperating if the crew conceals the archive's destination or treats her as cargo; the archive must remain with her and the crew.",
        },
        {
          term: "Officer Sato intervenes",
          text: "Sato recognises the medic's altered routine and attempts a private verification, producing one identity-confirmation check.",
        },
        {
          term: "The handover slips",
          text: "A delayed ambulance drone arrival overlaps the medication cycle ending at minute three, forcing a choice between waiting in custody range or using the unapproved route.",
        },
      ],
    },
    {
      kind: "prose",
      heading: "When the Subject Leaves Custody",
      paragraphs: [
        "When the crew completes walking Quell off the floor, the objective phase is complete but the score is not. Quell, her archive, and the crew are off the custody floor; two crew members must still support her until the ambulance drone or another suitable transport carries her. Direct wrist-implant custody tracking ends, the movement pressure ends, and escape routes become central. Security discovers the absence at the twelve-minute roll call unless an earlier named check or unlooped camera already confirmed it. Leaving the floor alone is not mission success.",
      ],
    },
    {
      kind: "list",
      heading: "The Getaway",
      items: [
        {
          term: "Ambulance launch",
          text: "The crew loads Quell and the archive into the waiting drone and escapes through the exposed corporate air lane if the dispatcher accepts their story.",
        },
        {
          term: "Transit disguise",
          text: "Two crew members support Quell through the lobby until a suitable executive transport carries her; a real Helix employee must vouch for her identity.",
        },
        {
          term: "Storm-drain conduit",
          text: "Two crew members support Quell through the contaminated runoff and collapsing access panels; the ambulance drone and bulky kit must be abandoned.",
        },
        {
          term: "Service gantry",
          text: "Two crew members support Quell across the gantry unless a secured transport aid is brought there; bulky equipment must be abandoned.",
        },
        {
          term: "Pursuit",
          text: "Sato can pursue only after the twelve-minute roll call, an unlooped balcony camera identifies Quell and the crew, or another named check confirms the extraction.",
        },
      ],
    },
    {
      kind: "list",
      heading: "Flashback Opportunities",
      items: [
        {
          text: "Arrange a live Helix dispatch relay to replace the cancelled ambulance destination.",
        },
        {
          text: "Plant leverage proving Officer Sato falsified an earlier welfare report.",
        },
        {
          text: "Secure a cooperative medic willing to authenticate the altered handover.",
        },
        {
          text: "Map the storm-drain wash cycle, cache respirators, and prepare a support route for two crew members.",
        },
        {
          text: "Prepare a biometric loop built from Quell's previous compliance interview; once installed, it remains effective until restored or replaced.",
        },
      ],
    },
  ],
  annotation: {
    heading: "When the objective and the escape are two different problems",
    paragraphs: [
      "The Quell Extraction is worth studying for what happens after the score's normal climax. Most heist structures treat lifting the prize as the finish line and the getaway as denouement; here, walking Quell off the custody floor explicitly is not mission success, because her injury means the crew is still moving at a fraction of normal speed with the clock still running. That single design choice, stated outright in the generator's own output, keeps the tension from collapsing the moment the 'theft' succeeds.",
      "It also demonstrates how an Extraction heist reframes every other convention: the prize can refuse to cooperate, the getaway vehicle is itself a plot point (a cancelled transponder record), and the alarm track measures confirmation of an absence rather than discovery of a break-in. The same layered-security, escalating-alarm skeleton the Heist Generator uses for a vault theft holds up cleanly for a hostage-style extraction with a different vocabulary laid over it.",
    ],
  },
  relatedGenerators: [
    {
      title: "Heist generator",
      description:
        "Generate a full score, including extraction and rescue objectives with their own pressure and getaway logic.",
      href: "/generators/heist",
    },
    {
      title: "Faction generator",
      description:
        "Create the corporation, syndicate, or agency holding the subject in custody.",
      href: "/generators/faction",
    },
    {
      title: "NPC generator",
      description:
        "Generate the compliance architect, protection officer, or medic at the centre of the extraction.",
      href: "/generators/npc",
    },
  ],
  relatedAnswers: [
    {
      title: "What makes a good heist target in a tabletop RPG",
      description:
        "The design checklist behind a prize, or a subject, that generates its own complications.",
      href: "/answers/what-makes-a-good-heist-target-in-a-tabletop-rpg",
    },
    {
      title: "How to run a heist in a tabletop RPG",
      description:
        "The four-phase framework for running the session once the target is set.",
      href: "/answers/how-do-you-run-a-heist-in-a-tabletop-rpg",
    },
  ],
  relatedForPages: [
    {
      title: "Codex Cryptica for Cyberpunk RED",
      description:
        "Corporate custody, whistleblowers, and extraction jobs built for a Cyberpunk RED campaign.",
      href: "/for/cyberpunk-red",
    },
  ],
  relatedExamples: ["the-dawnheart-diadem-fantasy-heist"],
  sourceUrl: "https://github.com/eserlan/Codex-Cryptica/issues/2850",
  seo: {
    title: "Cyberpunk heist example: The Quell Extraction | Codex Cryptica",
    description:
      "A table-ready cyberpunk extraction heist: a whistleblower who can refuse to cooperate, a cancelled transponder, and a getaway that starts before the objective ends.",
  },
};
