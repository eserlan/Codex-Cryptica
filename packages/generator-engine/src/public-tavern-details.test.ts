import { describe, expect, it } from "vitest";
import { buildTavernDetails } from "./public-tavern-details";
import { socialHubConfig } from "./public-social-hub-config";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const base = {
  atmosphere: "Rowdy and welcoming",
  wealthLevel: "Modest (reliable, no frills)",
  clientele: "Mixed locals",
  settlementType: "Market town",
};

describe("buildTavernDetails", () => {
  it("gives every built-in trouble its own hook, rumours and entity seed", () => {
    const hooks = new Set<string>();
    const seeds = new Set<string>();
    for (const trouble of socialHubConfig.troubles) {
      const details = buildTavernDetails({ ...base, trouble }, seededRng(1));
      hooks.add(details.hook);
      seeds.add(details.troubleSeed);
      expect(details.rumours).toHaveLength(3);
      expect(new Set(details.rumours).size).toBe(3);
    }
    expect(hooks.size).toBe(socialHubConfig.troubles.length);
    expect(seeds.size).toBe(socialHubConfig.troubles.length);
  });

  it("gives every built-in wealth level its own signature and room note", () => {
    const signatures = new Set(
      socialHubConfig.wealthLevels.map(
        (wealthLevel) =>
          buildTavernDetails(
            { ...base, wealthLevel, trouble: socialHubConfig.troubles[0] },
            seededRng(1),
          ).signature,
      ),
    );
    expect(signatures.size).toBe(socialHubConfig.wealthLevels.length);
  });

  it("ends the rumours with one tied to the settlement type", () => {
    const details = buildTavernDetails(
      {
        ...base,
        settlementType: "Coastal port",
        trouble: socialHubConfig.troubles[0],
      },
      seededRng(2),
    );
    expect(details.rumours[2]).toContain("ship in the harbour");
  });

  it("falls back to wording that quotes an unknown trouble and custom values", () => {
    const details = buildTavernDetails(
      {
        atmosphere: "Drowsy",
        wealthLevel: "Ostentatious",
        clientele: "River pilots",
        settlementType: "Swamp hamlet",
        trouble: "The well has turned to brine",
      },
      seededRng(3),
    );
    expect(details.ownerNote).toContain("drowsy");
    expect(details.signature).toBe(
      "The house speciality, priced for an ostentatious house",
    );
    expect(details.patronNotes[0]).toContain("river pilots");
    expect(details.rumours).toContain(
      "Travellers say this swamp hamlet is less quiet than it looks",
    );
    expect(details.rumours.join(" ")).toContain("the well has turned to brine");
    expect(details.troubleSeed).toContain("Whoever is behind the trouble");
  });
});
