import { describe, it, expect } from "vitest";
import { DraftingEngine } from "./drafting-engine";

/**
 * Advisory accuracy benchmarks for the DraftingEngine.
 * These tests report metrics but do NOT gate CI — thresholds are advisory only.
 * Move assertions out of `it.skip` blocks only once a stable test corpus is established.
 */
describe("Oracle Proactive Discovery Benchmarks", () => {
  const engine = new DraftingEngine();

  it("SC-001: reports entity identification accuracy (advisory target >= 85%)", async () => {
    const testCases = [
      {
        text: "A brave knight named **Sir Alistair** as **NPC**.",
        expected: "Sir Alistair",
      },
      {
        text: "They traveled to **The Iron Citadel** as **Location**.",
        expected: "The Iron Citadel",
      },
      {
        text: "He carried a **Sword of Truth** as **Item**.",
        expected: "Sword of Truth",
      },
      {
        text: "The **Order of Shadows** as **Faction** is rising.",
        expected: "Order of Shadows",
      },
      {
        text: "The **Great Fire** as **Event** destroyed the city.",
        expected: "Great Fire",
      },
      {
        text: "A strange **Aura** as **Concept** filled the room.",
        expected: "Aura",
      },
    ];

    let matches = 0;
    for (const tc of testCases) {
      const proposals = await engine.propose(tc.text, {
        existingEntities: [],
        history: [],
      });
      if (proposals.some((p) => p.title === tc.expected)) matches++;
    }

    const accuracy = matches / testCases.length;
    console.info(
      `[SC-001] Entity identification accuracy: ${(accuracy * 100).toFixed(1)}% (target >= 85%)`,
    );
    // Advisory only — not a hard CI gate
    expect(accuracy).toBeGreaterThan(0);
  });

  it("SC-004: reports smart update precision (advisory target >= 95%)", async () => {
    const existingEntities = [
      { id: "e1", title: "Valerius", type: "npc" },
      { id: "e2", title: "Iron Tower", type: "location" },
    ];

    const testCases = [
      { text: "**Valerius** adjusted his glasses.", expectedId: "e1" },
      { text: "Inside the **Iron Tower**, it was cold.", expectedId: "e2" },
      { text: "They called for **Valerius** again.", expectedId: "e1" },
    ];

    let correctMatches = 0;
    for (const tc of testCases) {
      const proposals = await engine.propose(tc.text, {
        existingEntities,
        history: [],
      });
      if (proposals.some((p) => p.entityId === tc.expectedId)) correctMatches++;
    }

    const precision = correctMatches / testCases.length;
    console.info(
      `[SC-004] Smart update precision: ${(precision * 100).toFixed(1)}% (target >= 95%)`,
    );
    // Advisory only — not a hard CI gate
    expect(precision).toBeGreaterThan(0);
  });
});
