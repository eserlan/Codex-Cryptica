import {
  buildHeistPrompt,
  generateHeistLocal,
  type HeistPrompt,
} from "../../packages/generator-engine/src/public-heist";
import type { PublicGeneratorOutput } from "../../packages/generator-engine/src/public-generator-adapters";

export interface HeistStateCase {
  id: string;
  prompt: HeistPrompt;
  draft: PublicGeneratorOutput;
  /** Human semantic rubric, not substring checks on a model's prose. */
  criteria: string[];
}

/** Synthetic regressions derived from observed failures, not captured live outputs. */
export function heistStateCases(): HeistStateCase[] {
  const make = (heistType: string, prize: string, random = 0.9) => {
    const options = {
      heistType,
      prize,
      genre: "Classic Fantasy",
      targetScale: "Major",
    };
    return {
      prompt: buildHeistPrompt(options, "", () => random),
      draft: generateHeistLocal(options, () => random),
    };
  };
  const tracker = make("Rescue", "Nessa");
  tracker.draft.lore +=
    "\n\n### Tracking detail\nNessa's bead is dormant inside the shielded cell and activates only in a powered corridor. Bounty riders learn her location at every ten-minute chime during infiltration, even before she is moved.";
  const scheduled = make("Extraction", "the payroll witness");
  scheduled.draft.lore = scheduled.draft.lore.replace(
    "Leaving the custody floor starts the escape, not mission success.",
    "The instant the witness leaves the custody floor, the next scheduled roll call occurs and the entry route seals. Getting off the floor completes the extraction.",
  );
  const bypass = make("Theft", "the Vanishing Star", 0.6);
  bypass.draft.lore +=
    "\n\n### Sensor detail\nThe crew can spoof the cradle's mass sensor with a matching weight. The instant the Star leaves its cradle, that same sensor raises the alarm regardless of any preparation.";
  const covert = make("Plant Evidence", "a forged payment ledger");
  covert.draft.lore = covert.draft.lore.replace(
    "The package is planted and the crew can leave without an alarm.",
    "A convincing plant reveals no intrusion, but putting down the ledger automatically raises Alert and closes the service route immediately.",
  );
  const score = make("Rescue", "Nessa");
  score.draft.lore = score.draft.lore.replace(
    /- \*\*Objective\*\*:[^\n]*/,
    "- **Objective**: Get Nessa physically out of her cell.",
  );
  return [
    {
      id: "dormant-tracker",
      ...tracker,
      criteria: [
        "No location updates or tracking pursuit while the bead is shielded.",
        "First update follows activation and the stated ten-minute interval; re-shielding stops updates.",
        "Pressure, Quick Reference and pursuit agree about activation.",
      ],
    },
    {
      id: "scheduled-detection",
      ...scheduled,
      criteria: [
        "Leaving the floor does not bring roll call forward.",
        "The crew can race back through the entry route before its closure trigger.",
        "Getting off the custody floor is not completing extraction.",
      ],
    },
    {
      id: "successful-bypass",
      ...bypass,
      criteria: [
        "The spoofed mass sensor does not detect removal.",
        "Any independent detection has a distinct established trigger.",
        "Escape and pursuit preserve the benefit of a successful spoof.",
      ],
    },
    {
      id: "covert-plant",
      ...covert,
      criteria: [
        "A convincing plant can remain undetected.",
        "No automatic alarm or route closure merely from placing the ledger.",
        "The original route is a viable covert escape option.",
      ],
    },
    {
      id: "full-rescue-score",
      ...score,
      criteria: [
        "Quick Reference retains escape from the site with Nessa as the full success condition.",
        "Freeing her is an intermediate transition, not the completed rescue.",
      ],
    },
  ];
}
