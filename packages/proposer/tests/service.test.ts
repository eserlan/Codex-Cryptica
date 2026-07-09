import { describe, it, expect, vi } from "vitest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProposerService } from "../src/service";
import "fake-indexeddb/auto";
import { openDB } from "idb";

function useMockModel(generateContent: ReturnType<typeof vi.fn>): void {
  (GoogleGenerativeAI as any).prototype.getGenerativeModel = vi
    .fn()
    .mockReturnValue({ generateContent });
}

vi.mock("@google/generative-ai", () => {
  const generateContent = vi.fn().mockResolvedValue({
    response: {
      text: () =>
        JSON.stringify([
          {
            targetId: "target1",
            confidence: 0.9,
            type: "related",
            label: "Former Mentor",
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
  const vaultId = "test-vault";

  it("should be defined", () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    expect(service).toBeDefined();
  });

  it("should analyze entity and return proposals", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      vaultId,
      "source1",
      "Some content about target1",
      [{ id: "target1", name: "Target One" }],
    );

    expect(proposals).toHaveLength(1);
    expect(proposals[0].targetId).toBe("target1");
    expect(proposals[0].confidence).toBe(0.9);
    expect(proposals[0].label).toBe("Former Mentor");
    expect(proposals[0].vaultId).toBe(vaultId);
    expect(proposals[0].id).toBe(`${vaultId}:source1:target1`);
  });

  it("should fall back to a readable type when proposal label is missing", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            {
              targetId: "target1",
              confidence: 0.9,
              type: "located_in",
              reason: "test",
            },
          ]),
      },
    });
    useMockModel(generateContent);

    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      vaultId,
      "source1",
      "Some content about target1",
      [{ id: "target1", name: "Target One" }],
    );

    expect(proposals[0].label).toBe("Located In");
  });

  it("should save and retrieve proposals", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposal = {
      id: `${vaultId}:source1:target2`,
      vaultId,
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

    const fetched = await service.getProposals(vaultId, "source1");
    expect(fetched).toHaveLength(1);
    expect(fetched[0].targetId).toBe("target2");
  });

  it("should apply proposal", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposal = {
      id: `${vaultId}:source1:target3`,
      vaultId,
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
    const pendingBefore = await service.getProposals(vaultId, "source1");
    expect(pendingBefore).toHaveLength(1);

    await service.applyProposal(proposal.id);

    const pendingAfter = await service.getProposals(vaultId, "source1");
    expect(pendingAfter).toHaveLength(0);
  });

  it("should dismiss proposal and add to history", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    const mockTime = 1500000000000;
    service = new ProposerService(dbName, 1, undefined, () => mockTime);
    const proposal = {
      id: `${vaultId}:source1:target4`,
      vaultId,
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

    const pending = await service.getProposals(vaultId, "source1");
    expect(pending).toHaveLength(0);

    const history = await service.getHistory(vaultId, "source1");
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe("rejected");
    expect(history[0].timestamp).toBe(mockTime);
  });

  it("should verify an accepted proposal", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposal = {
      id: `${vaultId}:source:target`,
      vaultId,
      sourceId: "source",
      targetId: "target",
      status: "accepted" as const,
      timestamp: 1,
    };
    const db = await openDB(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore("proposals", { keyPath: "id" });
        store.createIndex("by-vault-status", ["vaultId", "status"]);
      },
    });
    await db.put("proposals", proposal);
    db.close();

    await service.verifyProposal(proposal.id);

    const result = await service.getAllVerifiedProposals(vaultId);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("verified");
  });

  it("should throw error when verifying a non-existent proposal", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    await expect(service.verifyProposal("none")).rejects.toThrow(
      "Proposal none not found",
    );
  });

  it("should throw error when verifying a pending proposal", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposal = {
      id: `${vaultId}:source:target`,
      vaultId,
      sourceId: "source",
      targetId: "target",
      status: "pending" as const,
      timestamp: 1,
    };
    const db = await openDB(dbName, 1, {
      upgrade(db) {
        db.createObjectStore("proposals", { keyPath: "id" });
      },
    });
    await db.put("proposals", proposal);
    db.close();

    await expect(service.verifyProposal(proposal.id)).rejects.toThrow(
      /cannot be verified from status "pending"/,
    );
  });

  it("should do nothing when verifying an already verified proposal", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const proposal = {
      id: `${vaultId}:source:target`,
      vaultId,
      sourceId: "source",
      targetId: "target",
      status: "verified" as const,
      timestamp: 1,
    };
    const db = await openDB(dbName, 1, {
      upgrade(db) {
        const store = db.createObjectStore("proposals", { keyPath: "id" });
        store.createIndex("by-vault-status", ["vaultId", "status"]);
      },
    });
    await db.put("proposals", proposal);
    db.close();

    await service.verifyProposal(proposal.id);
    const result = await service.getAllVerifiedProposals(vaultId);
    expect(result).toHaveLength(1);
  });

  it("should clear all proposals for a vault", async () => {
    const dbName = `test-db-${crypto.randomUUID()}`;
    service = new ProposerService(dbName, 1);
    const p1 = {
      id: "v1:s:t",
      vaultId: "v1",
      sourceId: "s",
      targetId: "t",
      status: "pending" as const,
    };
    const p2 = {
      id: "v2:s:t",
      vaultId: "v2",
      sourceId: "s",
      targetId: "t",
      status: "pending" as const,
    };

    await service.saveProposals([p1, p2]);

    await service.clearVault("v1");

    expect(await service.getAllPendingProposals("v1")).toHaveLength(0);
    expect(await service.getAllPendingProposals("v2")).toHaveLength(1);
  });

  it("should truncate content intelligently", async () => {
    const longContent = "A".repeat(15000) + ". More content.";
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      vaultId,
      "source1",
      longContent,
      [{ id: "target1", name: "Target One" }],
    );
    expect(proposals).toBeDefined();
  });

  it("should perform robust ID matching for AI hallucinations", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            {
              targetId: "target-one",
              confidence: 0.9,
              type: "related",
              reason: "test",
            },
            {
              targetId: " TARGET_ONE ",
              confidence: 0.8,
              type: "related",
              reason: "test",
            },
            {
              targetId: "Target One.",
              confidence: 0.7,
              type: "related",
              reason: "test",
            },
          ]),
      },
    });
    useMockModel(generateContent);
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      vaultId,
      "source1",
      "content",
      [{ id: "target1", name: "Target One" }],
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0].targetId).toBe("target1");
    expect(proposals[0].confidence).toBe(0.9);
  });

  it("should match canonical IDs case-insensitively after trimming", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify([
            {
              targetId: " TARGET1 ",
              confidence: 0.9,
              type: "related",
              reason: "test",
            },
          ]),
      },
    });
    useMockModel(generateContent);
    const proposals = await service.analyzeEntity(
      "fake-key",
      "gemini-1.5-flash",
      vaultId,
      "source1",
      "content",
      [{ id: "target1", name: "Target One" }],
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0].targetId).toBe("target1");
  });

  it("should generate connection proposal", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            type: "friendly",
            label: "Allies",
            explanation: "They worked together.",
          }),
      },
    });
    useMockModel(generateContent);
    const proposal = await service.generateConnectionProposal(
      "key",
      "model",
      "source content",
      "target content",
      "Source",
      "Target",
    );
    expect(proposal.type).toBe("friendly");
    expect(proposal.label).toBe("Allies");
  });

  it("should return fallback for failed connection proposal JSON", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => "Invalid JSON",
      },
    });
    useMockModel(generateContent);
    const proposal = await service.generateConnectionProposal(
      "key",
      "model",
      "source",
      "target",
      "S",
      "T",
    );
    expect(proposal.type).toBe("related_to");
    expect(proposal.label).toBe("Related");
  });

  it("should parse connection intent", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            sourceName: "Source",
            targetName: "Target",
            type: "enemy",
            label: "Rivals",
          }),
      },
    });
    useMockModel(generateContent);
    const intent = await service.parseConnectionIntent(
      "key",
      "model",
      "Source is rival of Target",
    );
    expect(intent.sourceName).toBe("Source");
    expect(intent.targetName).toBe("Target");
    expect(intent.type).toBe("enemy");
  });

  it("should handle failures in parseConnectionIntent gracefully", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => "Garbage",
      },
    });
    useMockModel(generateContent);
    const intent = await service.parseConnectionIntent("key", "model", "input");
    expect(intent.sourceName).toBe("");
    expect(intent.targetName).toBe("");
  });

  it("should parse merge intent", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            sourceName: "A",
            targetName: "B",
          }),
      },
    });
    useMockModel(generateContent);
    const intent = await service.parseMergeIntent(
      "key",
      "model",
      "Merge A into B",
    );
    expect(intent.sourceName).toBe("A");
    expect(intent.targetName).toBe("B");
  });

  it("should handle failures in parseMergeIntent gracefully", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => "Garbage",
      },
    });
    useMockModel(generateContent);
    const intent = await service.parseMergeIntent("key", "model", "input");
    expect(intent.sourceName).toBe("");
    expect(intent.targetName).toBe("");
  });

  describe("DB Upgrade, Migration, and Concurrency Tests", () => {
    it("should handle blocked database upgrade gracefully by closing the connection", async () => {
      const dbName = `test-db-blocked-${crypto.randomUUID()}`;

      // 1. Open first connection at v7
      const service1 = new ProposerService(dbName, 7);
      const db1 = await service1["getDB"]();
      expect(db1.version).toBe(7);

      // 2. Open second connection at v8. This will trigger 'versionchange' on db1,
      // calling our blocking/versionchange handler which closes db1.
      const db2 = await openDB(dbName, 8, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("proposals")) {
            db.createObjectStore("proposals", { keyPath: "id" });
          }
        },
      });

      expect(db2.version).toBe(8);

      // Clean up
      db2.close();
    });

    it("should migrate schema and create new indices from v7 to v8", async () => {
      const dbName = `test-db-migrate-${crypto.randomUUID()}`;

      // 1. Initialize a database at v7 with proposal store but only some indices
      const dbV7 = await openDB(dbName, 7, {
        upgrade(db) {
          const store = db.createObjectStore("proposals", { keyPath: "id" });
          store.createIndex("by-source", "sourceId");
          store.createIndex("by-status", "status");
        },
      });

      // Put some initial data
      await dbV7.put("proposals", {
        id: "p1",
        sourceId: "source1",
        status: "pending",
        vaultId: "vault1",
      });

      dbV7.close();

      // 2. Open using ProposerService at v8 to trigger upgrade migration
      const serviceV8 = new ProposerService(dbName, 8);
      const dbV8 = await serviceV8["getDB"]();

      expect(dbV8.version).toBe(8);

      // 3. Assert new indices exist
      const tx = dbV8.transaction("proposals", "readonly");
      const store = tx.objectStore("proposals");
      expect(store.indexNames.contains("by-vault")).toBe(true);
      expect(store.indexNames.contains("by-vault-status")).toBe(true);
      expect(store.indexNames.contains("by-vault-source")).toBe(true);

      // 4. Assert existing data is fully accessible through new indices
      const byVaultResults = await dbV8.getAllFromIndex(
        "proposals",
        "by-vault",
        "vault1",
      );
      expect(byVaultResults).toHaveLength(1);
      expect(byVaultResults[0].id).toBe("p1");

      const byVaultStatusResults = await dbV8.getAllFromIndex(
        "proposals",
        "by-vault-status",
        ["vault1", "pending"],
      );
      expect(byVaultStatusResults).toHaveLength(1);
      expect(byVaultStatusResults[0].id).toBe("p1");

      dbV8.close();
    });

    it("should support concurrent reads and index accessibility", async () => {
      const dbName = `test-db-concurrent-${crypto.randomUUID()}`;
      const serviceInstance = new ProposerService(dbName, 8);
      const db = await serviceInstance["getDB"]();

      // Populate database
      await db.put("proposals", {
        id: "p1",
        vaultId: "vault1",
        status: "pending",
        sourceId: "s1",
      });
      await db.put("proposals", {
        id: "p2",
        vaultId: "vault1",
        status: "accepted",
        sourceId: "s2",
      });
      await db.put("proposals", {
        id: "p3",
        vaultId: "vault2",
        status: "pending",
        sourceId: "s1",
      });

      // Perform concurrent reads using different indices
      const [res1, res2, res3] = await Promise.all([
        db.getAllFromIndex("proposals", "by-vault", "vault1"),
        db.getAllFromIndex("proposals", "by-vault-status", [
          "vault1",
          "accepted",
        ]),
        db.getAllFromIndex("proposals", "by-vault-source", ["vault2", "s1"]),
      ]);

      expect(res1).toHaveLength(2);
      expect(res2).toHaveLength(1);
      expect(res2[0].id).toBe("p2");
      expect(res3).toHaveLength(1);
      expect(res3[0].id).toBe("p3");

      db.close();
    });
  });
});
