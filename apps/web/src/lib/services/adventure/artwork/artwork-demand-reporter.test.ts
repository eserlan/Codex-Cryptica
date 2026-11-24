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
    disabled.reportFromSummary(sampleSummary, "session-1");
    expect(fetchFn).not.toHaveBeenCalled();

    const offline = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => true,
      isOnline: () => false,
    });
    offline.reportFromSummary(sampleSummary, "session-1");
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

    reporter.reportFromSummary(sampleSummary, "session-1");
    reporter.reportFromSummary(sampleSummary, "session-1");

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

  it("bounds cue arrays to the worker limits before sending", () => {
    const fetchFn = vi.fn<
      (input: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response("{}", { status: 200 }));
    const reporter = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => true,
      isOnline: () => true,
    });
    const denseSummary: ArtworkCueIndicator = {
      genre: "fantasy",
      place: {
        name: "Private place name",
        cues: Array.from({ length: 17 }, (_, index) => `cue-${index}`),
        unmappedCues: Array.from(
          { length: 17 },
          (_, index) => `unknown ${index}`,
        ),
        match: null,
      },
      npcs: [
        {
          name: "Private character name",
          cues: [],
          demographicCues: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
          match: null,
        },
      ],
    };

    reporter.reportFromSummary(denseSummary, "session-1");

    const locationBody = JSON.parse(
      String(fetchFn.mock.calls[0]?.[1]?.body),
    ) as Record<string, string[]>;
    const npcBody = JSON.parse(
      String(fetchFn.mock.calls[1]?.[1]?.body),
    ) as Record<string, string[]>;
    expect(locationBody.knownCues).toHaveLength(16);
    expect(locationBody.unmappedCues).toHaveLength(16);
    expect(npcBody.demographicCues).toHaveLength(8);
  });

  it("deduplicates within a session and reports again in a new session", () => {
    const fetchFn = vi.fn<
      (input: string, init?: RequestInit) => Promise<Response>
    >(async () => new Response("{}", { status: 200 }));
    const reporter = new ArtworkDemandReporter({
      fetchFn,
      resolveProxyUrl: () => "https://oracle-proxy.test",
      isEnabled: () => true,
      isOnline: () => true,
    });

    reporter.reportFromSummary(sampleSummary, "session-1");
    reporter.reportFromSummary(sampleSummary, "session-1");
    reporter.reportFromSummary(sampleSummary, "session-2");

    expect(fetchFn).toHaveBeenCalledTimes(4);
    expect(String(fetchFn.mock.calls[2]?.[1]?.body)).not.toContain("session-2");
  });
});
