import { describe, expect, it } from "vitest";
import {
  handleArtworkDemandGet,
  handleArtworkDemandPost,
  parseArtworkDemandPayload,
  type ArtworkDemandRow,
} from "./artwork-demand";
import type { D1DatabaseLike } from "./answer-aggregates";
import type { Env } from "./env";

function createFakeD1(): D1DatabaseLike & {
  rows: Map<string, ArtworkDemandRow>;
} {
  const rows = new Map<string, ArtworkDemandRow>();
  return {
    rows,
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              if (query.includes("INSERT INTO artwork_cue_demand")) {
                const [
                  signature,
                  type,
                  genre,
                  known_cues,
                  unmapped_cues,
                  demographic_cues,
                  matched_asset_id,
                  last_seen_at,
                ] = values as [
                  string,
                  ArtworkDemandRow["type"],
                  ArtworkDemandRow["genre"],
                  string,
                  string,
                  string,
                  string | null,
                  string,
                ];
                const existing = rows.get(signature);
                if (existing) {
                  existing.hit_count += 1;
                  existing.last_seen_at = last_seen_at;
                } else {
                  rows.set(signature, {
                    signature,
                    type,
                    genre,
                    known_cues,
                    unmapped_cues,
                    demographic_cues,
                    matched_asset_id,
                    hit_count: 1,
                    last_seen_at,
                  });
                }
              }
              return { success: true };
            },
            async all<T>() {
              const allRows = [...rows.values()];
              const limit = values[values.length - 1] as number;
              let filtered = allRows;
              if (query.includes("matched_asset_id IS NULL")) {
                filtered = filtered.filter((r) => r.matched_asset_id === null);
              } else if (query.includes("matched_asset_id IS NOT NULL")) {
                filtered = filtered.filter((r) => r.matched_asset_id !== null);
              }
              let idx = 0;
              if (query.includes("type = ?")) {
                const typeVal = values[idx++];
                filtered = filtered.filter((r) => r.type === typeVal);
              }
              if (query.includes("genre = ?")) {
                const genreVal = values[idx];
                filtered = filtered.filter((r) => r.genre === genreVal);
              }
              filtered.sort((a, b) => b.hit_count - a.hit_count);
              return { results: filtered.slice(0, limit) as T[] };
            },
          };
        },
      };
    },
  };
}

describe("artwork-demand worker endpoint", () => {
  it("validates and sanitizes payloads, rejecting unsafe or empty inputs", () => {
    expect(
      parseArtworkDemandPayload({
        type: "location",
        genre: "fantasy",
        knownCues: ["Coast", "ominous", "coast"],
        unmappedCues: ["Salt Garden"],
        demographicCues: [],
        matchedAssetId: null,
      }),
    ).toEqual({
      type: "location",
      genre: "fantasy",
      knownCues: ["coast", "ominous"],
      unmappedCues: ["salt garden"],
      demographicCues: [],
      matchedAssetId: null,
    });

    expect(
      parseArtworkDemandPayload({
        type: "npc",
        genre: "fantasy",
        knownCues: [],
        unmappedCues: [],
        demographicCues: [],
      }),
    ).toBeNull();

    expect(parseArtworkDemandPayload({
      type: "location",
      genre: "fantasy",
      knownCues: Array.from({ length: 17 }, () => "coast"),
      unmappedCues: [],
      demographicCues: [],
    })).toBeNull();

    expect(parseArtworkDemandPayload({
      type: "npc",
      genre: "fantasy",
      knownCues: [],
      unmappedCues: [],
      demographicCues: Array.from({ length: 9 }, () => "female"),
    })).toBeNull();

    expect(
      parseArtworkDemandPayload({
        type: "location",
        genre: "fantasy",
        knownCues: ["Ivenna Surr said hello!"],
        unmappedCues: [],
        demographicCues: [],
      }),
    ).toBeNull();

    expect(
      parseArtworkDemandPayload({
        type: "invalid-type",
        genre: "fantasy",
        knownCues: ["forest"],
      }),
    ).toBeNull();
  });

  it("increments hit_count on repeated cue tuples and aggregates unmapped summary", async () => {
    const db = createFakeD1();
    const env = { ANSWER_AGGREGATES: db } as unknown as Env;

    const post = (body: unknown) =>
      handleArtworkDemandPost(
        new Request("https://oracle-proxy.test/api/artwork-demand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        env,
        { now: () => "2026-11-24T00:00:00.000Z" },
      );

    const res1 = await post({
      type: "location",
      genre: "fantasy",
      knownCues: ["coast", "ominous", "day"],
      unmappedCues: ["salt garden"],
      demographicCues: [],
      matchedAssetId: null,
    });
    expect(res1.status).toBe(200);

    const res2 = await post({
      type: "location",
      genre: "fantasy",
      knownCues: ["day", "coast", "ominous"],
      unmappedCues: ["salt garden"],
      demographicCues: [],
      matchedAssetId: null,
    });
    expect(res2.status).toBe(200);

    await post({
      type: "npc",
      genre: "fantasy",
      knownCues: ["human", "scholar"],
      unmappedCues: ["ledger-keeper"],
      demographicCues: ["female"],
      matchedAssetId: "npc-fantasy-scholar-01",
    });

    const getMissing = await handleArtworkDemandGet(
      new Request(
        "https://oracle-proxy.test/api/artwork-demand?status=missing&type=location",
      ),
      env,
    );
    expect(getMissing.status).toBe(200);
    const data = (await getMissing.json()) as {
      items: Array<{ hitCount: number; unmappedCues: string[] }>;
      unmappedSummary: Array<{ cue: string; hitCount: number }>;
    };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.hitCount).toBe(2);
    expect(data.unmappedSummary).toEqual([{ cue: "salt garden", hitCount: 2 }]);
  });

  it("rejects malformed JSON and missing database cleanly", async () => {
    const resNoDb = await handleArtworkDemandPost(
      new Request("https://oracle-proxy.test/api/artwork-demand", {
        method: "POST",
        body: "{}",
      }),
      {} as Env,
    );
    expect(resNoDb.status).toBe(500);

    const db = createFakeD1();
    const resBadJson = await handleArtworkDemandPost(
      new Request("https://oracle-proxy.test/api/artwork-demand", {
        method: "POST",
        body: "{bad",
      }),
      { ANSWER_AGGREGATES: db } as unknown as Env,
    );
    expect(resBadJson.status).toBe(400);
  });
});
