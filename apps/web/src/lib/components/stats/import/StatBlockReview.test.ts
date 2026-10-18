/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import StatBlockReview from "./StatBlockReview.svelte";
import { StatBlockImportController } from "./stat-block-import-controller.svelte";
import type { StatBlockImportDeps } from "./stat-block-import-controller.svelte";

const SOURCE = `Hill Brute
Large giant, chaotic evil
Armor Class 13
Hit Points 45
Challenge 3
STR 18 (+4) DEX 8 (-1) CON 14 (+2) INT 6 (-2) WIS 9 (-1) CHA 7 (-2)
Languages Draconic`;

const REPLY = {
  outcome: "ok",
  looksLike: "tov",
  kind: "creature",
  name: "Hill Brute",
  values: {
    size: "Large",
    cr: "3",
    ac: 13,
    hp: 45,
    abilityScores: { str: 18, dex: 8, con: 14, int: 6, wis: 9, cha: 7 },
    languages: "Draconic",
  },
  notes: [],
  leftovers: [
    { label: "Lair actions", text: "The brute can pound the ground." },
  ],
};

function deps(
  overrides: Partial<StatBlockImportDeps> = {},
): StatBlockImportDeps {
  return {
    gateway: { complete: vi.fn(async () => JSON.stringify(REPLY)) },
    aiDisabled: () => false,
    targetEntity: () => null,
    findEntityByTitle: () => null,
    updateEntity: vi.fn(),
    createEntity: vi.fn(() => "new-1"),
    entityTypeFor: () => "creature",
    ...overrides,
  };
}

async function reviewed(): Promise<StatBlockImportController> {
  const controller = new StatBlockImportController(deps());
  controller.setSource(SOURCE);
  await controller.read();
  return controller;
}

describe("StatBlockReview", () => {
  it("labels every row with its state as text, not only by colour", async () => {
    const controller = await reviewed();
    render(StatBlockReview, { props: { controller } });

    const acRow = document.querySelector('[data-path="ac"]');
    expect(acRow?.textContent).toContain("Found");

    const dexRow = document.querySelector('[data-path="abilityScores.dex"]');
    expect(dexRow?.textContent).toContain("Found");

    const speedRow = document.querySelector('[data-path="speed"]');
    expect(speedRow?.textContent).toContain("Not found");
  });

  it("shows a check value with the source text it came from", async () => {
    const controller = await reviewed();
    controller.edit("ac", 13);
    controller.result = {
      ...controller.result!,
      notes: [
        {
          path: "languages",
          state: "check",
          reason: "not-in-source",
          source: "Languages Draconic?",
        },
      ],
    };
    render(StatBlockReview, { props: { controller } });
    expect(screen.getByTestId("stat-block-source").textContent).toContain(
      "Languages Draconic?",
    );
    const row = document.querySelector('[data-path="languages"]');
    expect(row?.textContent).toContain("Check this");
  });

  it("lists leftovers so nothing is dropped silently", async () => {
    const controller = await reviewed();
    render(StatBlockReview, { props: { controller } });
    const leftovers = screen.getByTestId("stat-block-leftovers");
    expect(leftovers.textContent).toContain("Lair actions");
    expect(leftovers.textContent).toContain("The brute can pound the ground.");
  });

  it("shows the quick-reader notice when AI was off", async () => {
    const controller = new StatBlockImportController(
      deps({ aiDisabled: () => true }),
    );
    controller.setSource(SOURCE);
    await controller.read();
    render(StatBlockReview, { props: { controller } });
    expect(
      screen.getByTestId("stat-block-quick-reader-notice").textContent,
    ).toContain("AI is off, so a quick reader was used.");
  });

  it("lists what is still needed before saving", async () => {
    const controller = await reviewed();
    controller.edit("hp", undefined);
    render(StatBlockReview, { props: { controller } });
    expect(screen.getByTestId("stat-block-missing").textContent).toContain(
      "Hit Points",
    );
  });
});
