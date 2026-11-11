import { describe, expect, it } from "bun:test";
import {
  repairProposal,
  toHexKey,
  type HexCoord,
  type TerrainId,
} from "../../src";
import { everywhere, stateWith, type FixedTerrain } from "./fixtures";

const ALL: TerrainId[] = [
  "plains",
  "forest",
  "hills",
  "mountains",
  "swamp",
  "desert",
  "water",
  "coast",
  "tundra",
];
const hexes = (...pairs: Array<[number, number]>): HexCoord[] =>
  pairs.map(([q, r]) => ({ q, r }));
const wrap = (hexList: HexCoord[], terrain: Record<string, TerrainId>) =>
  Object.fromEntries(hexList.map((h) => [toHexKey(h), terrain[toHexKey(h)]]));

function repair(
  proposed: Record<string, TerrainId>,
  fixed: Record<string, FixedTerrain> = {},
  options: {
    available?: TerrainId[];
    inBounds?: (h: HexCoord) => boolean;
  } = {},
) {
  const targets = Object.keys(proposed)
    .map((k) => ({ q: Number(k.split(",")[0]), r: Number(k.split(",")[1]) }))
    .sort((a, b) => a.q - b.q || a.r - b.r);
  const copy = { ...proposed };
  repairProposal({
    proposed: copy,
    targets,
    state: stateWith(fixed),
    inBounds: options.inBounds ?? everywhere,
    available: new Set(options.available ?? ALL),
  });
  return copy;
}

describe("repairProposal: coast (FR-009)", () => {
  it("turns land beside water into coast when there is land behind it", () => {
    const out = repair(
      { "0,0": "water", "1,0": "plains", "2,0": "plains" },
      { "-1,0": "water" },
    );
    expect(out["1,0"]).toBe("coast");
    expect(out["2,0"]).toBe("plains");
  });

  it("turns a speck of land surrounded by water into water", () => {
    const water = Object.fromEntries(
      [
        [1, 0],
        [1, -1],
        [0, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
      ].map(([q, r]) => [`${q},${r}`, "water" as const]),
    );
    const fixed = { "2,0": "water", "2,-1": "water" } as const;
    const out = repair({ "0,0": "plains", ...water }, { ...fixed });
    expect(out["0,0"]).toBe("water");
  });

  it("turns proposed water beside fixed land into coast", () => {
    const out = repair(
      { "0,0": "water", "-1,0": "water" },
      { "1,0": "plains" },
    );
    expect(out["0,0"]).toBe("coast");
  });

  it("proposes no coast when coast is set to none, and leaves the rest alone", () => {
    const out = repair(
      { "0,0": "plains", "1,0": "water" },
      {},
      { available: ALL.filter((t) => t !== "coast") },
    );
    expect(out).toEqual({ "0,0": "plains", "1,0": "water" });
  });

  it("only keeps a coast hex that still borders both water and land", () => {
    // A lone coast candidate with neighbours that are all coast-ready land stays land.
    const out = repair({ "0,0": "water", "1,0": "water", "2,0": "water" }, {});
    for (const id of Object.values(out)) expect(id).toBe("water");
  });

  it("treats the rim of a request as able to become either, so a coast there is kept", () => {
    const out = repair({ "0,0": "plains" }, { "-1,0": "water" });
    expect(out["0,0"]).toBe("coast"); // undecided neighbours provide the land side
  });
});

describe("repairProposal: mountains (FR-009a)", () => {
  const surrounded = (id: TerrainId) =>
    Object.fromEntries(
      [
        [1, 0],
        [1, -1],
        [0, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
      ].map(([q, r]) => [`${q},${r}`, id]),
    );

  it("lowers mountains with no high ground beside them to hills", () => {
    expect(repair({ "0,0": "mountains" }, surrounded("plains"))["0,0"]).toBe(
      "hills",
    );
  });

  it("falls back to the nearest allowed terrain when hills is set to none", () => {
    const out = repair({ "0,0": "mountains" }, surrounded("plains"), {
      available: ALL.filter((t) => t !== "hills"),
    });
    expect(out["0,0"]).not.toBe("mountains");
    expect(out["0,0"]).not.toBe("hills");
  });

  it("keeps mountains beside hills, beside mountains and at the rim", () => {
    expect(
      repair(
        { "0,0": "mountains" },
        { ...surrounded("plains"), "1,0": "hills" },
      )["0,0"],
    ).toBe("mountains");
    expect(
      repair(
        { "0,0": "mountains" },
        { ...surrounded("plains"), "1,0": "mountains" },
      )["0,0"],
    ).toBe("mountains");
    expect(repair({ "0,0": "mountains" })["0,0"]).toBe("mountains");
  });

  it("keeps mountains when there is nothing lower it could become", () => {
    const only = ["mountains", "water", "coast"] as TerrainId[];
    expect(
      repair({ "0,0": "mountains" }, surrounded("plains"), { available: only })[
        "0,0"
      ],
    ).toBe("mountains");
  });
});

describe("repairProposal: fixed terrain", () => {
  it("never changes anything outside the proposal", () => {
    const fixed = { "1,0": "water", "-1,0": "mountains" } as const;
    const out = repair({ "0,0": "plains" }, { ...fixed });
    expect(Object.keys(out)).toEqual(["0,0"]);
    expect(wrap(hexes([0, 0]), out)["0,0"]).toBeDefined();
  });
});

describe("repairProposal: completing coast committed in an earlier pass (FR-016)", () => {
  const ring = (id: FixedTerrain, except: string) =>
    Object.fromEntries(
      [
        [1, 0],
        [1, -1],
        [0, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
      ]
        .map(([q, r]) => `${q},${r}`)
        .filter((k) => k !== except)
        .map((k) => [k, id]),
    );

  it("gives a fixed coast hex the water it still needs", () => {
    const out = repair(
      { "1,0": "plains" },
      { "0,0": "coast", ...ring("plains", "1,0") },
    );
    expect(out["1,0"]).toBe("water");
  });

  it("gives a fixed coast hex the dry ground it still needs", () => {
    const out = repair(
      { "1,0": "water" },
      { "0,0": "coast", ...ring("water", "1,0") },
    );
    expect(out["1,0"]).not.toBe("water");
  });

  it("leaves a fixed coast hex alone when it is already satisfied", () => {
    const out = repair(
      { "1,0": "forest" },
      { "0,0": "coast", ...ring("plains", "1,0"), "-1,0": "water" },
    );
    expect(out["1,0"]).toBe("forest");
  });

  it("cannot add water when water is set to none, and says nothing more", () => {
    const out = repair(
      { "1,0": "plains" },
      { "0,0": "coast", ...ring("plains", "1,0") },
      { available: ALL.filter((t) => t !== "water") },
    );
    expect(out["1,0"]).toBe("plains");
  });
});
