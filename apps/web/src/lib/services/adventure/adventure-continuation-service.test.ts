import { describe, expect, it, vi } from "vitest";
import type { AdventureSession } from "@codex/adventure-engine";
import { AdventureContinuationService } from "./adventure-continuation-service";

function session(): AdventureSession {
  const now = "2026-11-25T00:00:00.000Z";
  return {
    schemaVersion: 3,
    id: "adv-1",
    vaultId: "v-1",
    title: "Well Dispute",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 1,
    playerCharacter: {
      kind: "provisional",
      name: "Roka",
      description: "Scout",
    },
    premise: "Water access is contested.",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  };
}

describe("AdventureContinuationService (#5193)", () => {
  it("returns deterministic candidates offline and falls back when generator fails or leaks secrets", async () => {
    const s = session();
    s.people = [
      { id: "p-1", name: "Clerk Sándor", aliases: [], linkedFactIds: ["kf-1"] },
    ];
    s.visibleState.knownFacts = [
      {
        id: "kf-1",
        text: "Clerk Sándor stamped the canal order.",
        source: "provisional",
      },
    ];
    s.hiddenState.secrets.push({
      id: "sec-1",
      text: "The mayor poisoned the spring",
      status: "hidden",
    });

    const offlineService = new AdventureContinuationService({
      isOnline: () => false,
      generateDraft: vi.fn(),
    });
    const set = offlineService.buildCandidates(s);
    expect(set.candidates).toHaveLength(1);
    const offlineRes = await offlineService.enrichCandidate(
      s,
      set.candidates[0]!,
    );
    expect(offlineRes.enriched).toBe(false);
    expect(offlineRes.candidate.id).toBe(set.candidates[0]!.id);

    // Leaking AI output is rejected and falls back to baseline
    const leakingService = new AdventureContinuationService({
      isOnline: () => true,
      generateDraft: vi.fn().mockResolvedValue({
        title: "Uncover the mayor",
        summary: "Prove that the mayor poisoned the spring.",
      }),
    });
    const leakRes = await leakingService.enrichCandidate(s, set.candidates[0]!);
    expect(leakRes.enriched).toBe(false);
    expect(leakRes.candidate.playerSafePremise).toBe(
      set.candidates[0]!.playerSafePremise,
    );

    // Clean AI output enriches safely
    const generateCleanDraft = vi.fn().mockResolvedValue({
      title: "Sándor's Unanswered Ledger",
      summary: "Someone else may have countersigned Sándor's canal order.",
    });
    const cleanService = new AdventureContinuationService({
      isOnline: () => true,
      generateDraft: generateCleanDraft,
    });
    const candidate = { ...set.candidates[0]!, genreHint: "Modern Conspiracy" };
    const cleanRes = await cleanService.enrichCandidate(s, candidate);
    expect(cleanRes.enriched).toBe(true);
    expect(cleanRes.candidate.playerSafeTitle).toBe(
      "Sándor's Unanswered Ledger",
    );
    const request = generateCleanDraft.mock.calls[0]![0];
    expect(request.generatorId).toBe("quest");
    expect(request.options.genre).toBe("Modern Conspiracy");
    expect(request.instructions).toContain("one concise next-adventure pitch");
  });

  it("falls back when the generator does not return a complete bounded pitch", async () => {
    const s = session();
    s.people = [
      { id: "p-1", name: "Clerk Sándor", aliases: [], linkedFactIds: ["kf-1"] },
    ];
    s.visibleState.knownFacts = [
      {
        id: "kf-1",
        text: "Clerk Sándor stamped the canal order.",
        source: "provisional",
      },
    ];
    const candidate = new AdventureContinuationService().buildCandidates(s)
      .candidates[0]!;
    const service = new AdventureContinuationService({
      isOnline: () => true,
      generateDraft: vi.fn().mockResolvedValue({
        title: "Too long",
        summary: "A".repeat(321),
      }),
    });

    const result = await service.enrichCandidate(s, candidate);
    expect(result.enriched).toBe(false);
    expect(result.candidate).toBe(candidate);
  });

  it("propagates AbortSignal cancellation cleanly", async () => {
    const s = session();
    s.people = [
      { id: "p-1", name: "Clerk Sándor", aliases: [], linkedFactIds: ["kf-1"] },
    ];
    s.visibleState.knownFacts = [
      {
        id: "kf-1",
        text: "Clerk Sándor stamped the canal order.",
        source: "provisional",
      },
    ];
    const controller = new AbortController();
    controller.abort();

    const service = new AdventureContinuationService({
      isOnline: () => true,
      generateDraft: vi.fn(),
    });
    const set = service.buildCandidates(s);
    await expect(
      service.enrichCandidate(
        s,
        set.candidates[0]!,
        "workspace",
        controller.signal,
      ),
    ).rejects.toThrow();
  });
});
