import { describe, expect, it, vi } from "vitest";
import { TableGenerationService } from "./table-generation-service";
import type { RandomTableGenerationContext } from "generator-engine";

describe("TableGenerationService", () => {
  it("orchestrates search retrieval, prompt building, AI generation, and candidate parsing", async () => {
    const mockSearch = {
      search: vi.fn().mockResolvedValue({
        results: [
          {
            item: {
              title: "Sera Voight",
              category: "character",
              summary: "Smuggler queen of the docks",
            },
          },
        ],
      }),
    };

    const mockAiGateway = {
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          title: "Smuggler's Cove Encounters",
          entries: [
            { text: "A patrol led by Sera Voight checking cargo manifests" },
            { text: "A sudden {fog_rolling_in} blinding the harbor" },
          ],
        }),
      ),
    };

    const mockSources = {
      all: [
        { id: "tbl-1", name: "fog_rolling_in", kind: "table" },
        { id: "tbl-2", name: "minor_loot", kind: "table" },
      ],
    };

    const service = new TableGenerationService({
      searchService: mockSearch as any,
      aiGateway: mockAiGateway as any,
      sourcesStore: mockSources as any,
    });

    const context: RandomTableGenerationContext = {
      topic: "Smuggler's Cove Encounters",
      count: 6,
      campaignContext: "Sera Voight is suspicious of strangers",
    };

    const result = await service.generateTableEntries(context);

    expect(mockSearch.search).toHaveBeenCalledWith(
      expect.stringContaining("Smuggler's Cove Encounters"),
      expect.any(Object),
    );
    expect(mockAiGateway.complete).toHaveBeenCalled();
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].text).toContain("Sera Voight");
    expect(result.candidates[0].selected).toBe(true);
    expect(result.candidates[1].text).toContain("{fog_rolling_in}");
    expect(result.candidates[1].matchedSubTables).toEqual(["fog_rolling_in"]);
  });

  it("falls back to local generator when AI is disabled or offline", async () => {
    const service = new TableGenerationService({
      aiPolicy: { isEnabled: false, isAvailable: false },
    });

    const context: RandomTableGenerationContext = {
      topic: "Dungeon Traps",
      count: 5,
    };

    const result = await service.generateTableEntries(context);
    expect(result.candidates).toHaveLength(5);
    expect(result.isFallback).toBe(true);
  });
});
