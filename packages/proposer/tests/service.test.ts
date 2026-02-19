import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProposerService } from "../src/service";
import "fake-indexeddb/auto";
import { openDB } from "idb";

vi.mock("@google/generative-ai", () => {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () =>
        JSON.stringify([
          {
            targetId: "target1",
            confidence: 0.9,
            type: "related",
            reason: "test",
          },
        ]),
    },
  });

  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent,
        };
      }
    },
  };
});

describe("ProposerService", () => {
  let service: ProposerService;
  let dbName: string;

  beforeEach(async () => {
    dbName = `test-db-${crypto.randomUUID()}`;

    // Setup DB schema for testing
    // We open and close immediately to ensure schema is created
    const db = await openDB(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("proposals")) {
          const store = db.createObjectStore("proposals", { keyPath: "id" });
          store.createIndex("by-source", "sourceId");
          store.createIndex("by-status", "status");
        }
      },
    });
    db.close();

    service = new ProposerService(dbName, 1);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should analyze entity and return proposals", async () => {
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      "source1",
      "Some content about target1",
      [{ id: "target1", name: "Target One" }],
    );

    expect(proposals).toHaveLength(1);
    expect(proposals[0].targetId).toBe("target1");
    expect(proposals[0].confidence).toBe(0.9);
  });

  it("should save and retrieve proposals", async () => {
    const proposal = {
      id: "source1:target2",
      sourceId: "source1",
      targetId: "target2",
      type: "related",
      context: "context",
      reason: "reason",
      confidence: 0.8,
      status: "pending" as const,
      timestamp: Date.now(),
    };

    await service.saveProposals([proposal]);

    const fetched = await service.getProposals("source1");
    expect(fetched).toHaveLength(1);
    expect(fetched[0].targetId).toBe("target2");
  });

  it("should apply proposal", async () => {
    const proposal = {
      id: "source1:target3",
      sourceId: "source1",
      targetId: "target3",
      type: "related",
      context: "context",
      reason: "reason",
      confidence: 0.8,
      status: "pending" as const,
      timestamp: Date.now(),
    };

    await service.saveProposals([proposal]);

    // Verify it's pending first
    const pendingBefore = await service.getProposals("source1");
    expect(pendingBefore).toHaveLength(1);

    await service.applyProposal(proposal.id);

    const pendingAfter = await service.getProposals("source1");
    expect(pendingAfter).toHaveLength(0);
  });

  it("should dismiss proposal and add to history", async () => {
    const proposal = {
      id: "source1:target4",
      sourceId: "source1",
      targetId: "target4",
      type: "related",
      context: "context",
      reason: "reason",
      confidence: 0.8,
      status: "pending" as const,
      timestamp: Date.now(),
    };

    await service.saveProposals([proposal]);
    await service.dismissProposal(proposal.id);

    const pending = await service.getProposals("source1");
    expect(pending).toHaveLength(0);

    const history = await service.getHistory("source1");
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("rejected");
  });

  it("should re-evaluate proposal from history", async () => {
    const proposal = {
      id: "source1:target5",
      sourceId: "source1",
      targetId: "target5",
      type: "related",
      context: "context",
      reason: "reason",
      confidence: 0.8,
      status: "rejected" as const,
      timestamp: Date.now(),
    };

    // Save as rejected directly
    const db = await openDB(dbName, 1);
    const tx = db.transaction("proposals", "readwrite");
    await tx.store.put(proposal);
    await tx.done;
    db.close();

    await service.reEvaluateProposal(proposal.id);

    const pending = await service.getProposals("source1");
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");
  });
});
