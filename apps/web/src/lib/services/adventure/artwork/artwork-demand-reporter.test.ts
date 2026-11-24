import { describe, expect, it, vi } from "vitest";
import { ArtworkDemandReporter } from "./artwork-demand-reporter";
import type { ArtworkCueIndicator } from "./artwork-cue-summary";

const sampleSummary: ArtworkCueIndicator = {
  genre: "fantasy",
  place: {
    name: "Twelve-Reed Court",
    cues: ["coast", "exterior", "ominous", "day"],
    unmappedCues: ["salt garden"],
    match: null,
  },
  npcs: [
    {
      name: "Ivenna Surr",
      cues: ["human", "scholar"],
      unmappedCues: ["ledger-keeper", "tide ledgers"],
      demographicCues: ["female"],
      match: "npc-fantasy-scholar-01",
    },
  ],
};

describe("ArtworkDemandReporter", () => {
  it("does nothing when disabled or offline", () => {
    const fetchFn = vi.fn();
    const disabled = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => false,
      isOnline: () => true,
    });
    disabled.reportFromSummary(sampleSummary);
    expect(fetchFn).not.toHaveBeenCalled();

    const offline = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => true,
      isOnline: () => false,
    });
    offline.reportFromSummary(sampleSummary);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends cue-only payloads without names and deduplicates repeated summaries", () => {
    const fetchFn = vi.fn<
      (input: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response("{}", { status: 200 }));
    const reporter = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test/",
      isEnabled: () => true,
      isOnline: () => true,
    });

    reporter.reportFromSummary(sampleSummary);
    reporter.reportFromSummary(sampleSummary);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const firstCallBody = JSON.parse(
      String(fetchFn.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>;
    const secondCallBody = JSON.parse(
      String(fetchFn.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;

    expect(firstCallBody).toEqual({
      type: "location",
      genre: "fantasy",
      knownCues: ["coast", "day", "exterior", "ominous"],
      unmappedCues: ["salt garden"],
      demographicCues: [],
      matchedAssetId: null,
    });
    expect(secondCallBody).toEqual({
      type: "npc",
      genre: "fantasy",
      knownCues: ["human", "scholar"],
      unmappedCues: ["ledger-keeper", "tide ledgers"],
      demographicCues: ["female"],
      matchedAssetId: "npc-fantasy-scholar-01",
    });
    expect(JSON.stringify(firstCallBody)).not.toContain("Twelve-Reed");
    expect(JSON.stringify(secondCallBody)).not.toContain("Ivenna");
  });

  it("forwards scene, atmosphere, and monster payloads without leaking names", () => {
    const fetchFn = vi.fn<
      (input: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response("{}", { status: 200 }));
    const reporter = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => true,
      isOnline: () => true,
    });

    reporter.reportFromSummary({
      genre: "fantasy",
      place: null,
      npcs: [],
      scene: { cues: ["ruins", "night"], unmappedCues: [], match: null },
      atmosphere: {
        cues: ["ominous", "rain"],
        unmappedCues: [],
        match: "atmo-fantasy-ominous-01",
      },
      monsters: [
        {
          name: "Salt Stalker",
          cues: [],
          unmappedCues: ["monster", "salt-stalker"],
          match: null,
        },
      ],
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    const types = fetchFn.mock.calls.map(
      (call) => (JSON.parse(String(call[1]?.body)) as { type: string }).type,
    );
    expect(types).toEqual(["scene", "atmosphere", "monster"]);
    expect(JSON.stringify(fetchFn.mock.calls)).not.toContain("Salt Stalker");
  });
});
