import type { SessionPrep } from "generator-engine";

/** The missing-courier example from the step-by-step session prep Answer. */
export const EXAMPLE_SESSION_PREP: SessionPrep = {
  version: 1,
  seed: "A courier carrying evidence against a local official vanished on the road into town.",
  start:
    "Riderless horse at the gate, saddlebags slashed, crowd forming. Maren pushes through.",
  pressure:
    "Reeve Callan wants the ledger burned before the circuit judge arrives in two days.",
  people: [
    {
      id: "example-callan",
      name: "Reeve Callan",
      wants: "the ledger burned",
      doesNext: "sends his men to the mill",
      source: "gm",
    },
    {
      id: "example-maren",
      name: "Maren",
      wants: "her brother found",
      doesNext: "goes to the mill alone if nobody helps",
      source: "gm",
    },
    {
      id: "example-dosh",
      name: "Sergeant Dosh",
      wants: "to stay out of the noose",
      doesNext: "turns witness if pressed",
      source: "gm",
    },
    {
      id: "example-tebb",
      name: "Old Tebb",
      wants: "paying before he talks",
      doesNext: "sells what he saw to whoever asks first",
      source: "gm",
    },
  ],
  places: [
    {
      id: "example-road",
      name: "Mill road ambush site",
      detail: "Churned mud, cart tracks, a dropped signet",
      source: "gm",
    },
    {
      id: "example-mill",
      name: "Mill grain loft",
      detail: "The courier, two guards, a hoist over the river",
      source: "gm",
    },
    {
      id: "example-counting-house",
      name: "Counting house",
      detail: "Tax rolls and letters that prove the theft on their own",
      source: "gm",
    },
  ],
  information: [
    {
      id: "example-courier",
      fact: "The courier is alive at the mill",
      routes: ["Tebb saw the cart turn", "mud at the ambush site", "Dosh"],
      critical: true,
      source: "gm",
    },
    {
      id: "example-callan-ordered",
      fact: "Callan ordered the ambush",
      routes: ["the signet", "Dosh", "counting house letters"],
      critical: true,
      source: "gm",
    },
  ],
  complications: [
    {
      id: "example-bribe",
      text: "Callan offers a generous job out of town",
      source: "gm",
    },
    {
      id: "example-guards",
      text: "Callan's men are already at the mill",
      source: "gm",
    },
    {
      id: "example-maren-alone",
      text: "Maren goes to the mill alone",
      source: "gm",
    },
  ],
  consequences: {
    success: "Callan is exposed before the judge and the town owes the party.",
    failure: "The courier dies and Callan tightens his grip on the watch.",
    delay: "By morning the courier is moved and the ledger is ash.",
    avoidance: "Maren blames the party and Callan starts asking who they are.",
  },
  reserve: [
    {
      id: "example-names",
      text: "Names: Wenna, Hob, Isolde, Garth",
      source: "gm",
    },
    {
      id: "example-tinker",
      text: "A travelling tinker with gossip",
      source: "gm",
    },
    {
      id: "example-ford",
      text: "A washed-out ford on the mill road",
      source: "gm",
    },
  ],
};
