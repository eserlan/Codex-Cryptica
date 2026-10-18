/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Entity } from "schema";
import StatBlockImportModal from "./StatBlockImportModal.svelte";
import {
  StatBlockImportController,
  type StatBlockImportDeps,
} from "./stat-block-import-controller.svelte";
import { TOV_MONSTER_TEMPLATE_ID } from "@codex/stat-sheet-engine";

const REPLY = {
  outcome: "ok",
  looksLike: "tov",
  kind: "creature",
  name: "Hill Brute",
  values: {
    cr: "3",
    ac: 13,
    hp: 45,
    abilityScores: { str: 18, dex: 8, con: 14, int: 6, wis: 9, cha: 7 },
  },
  notes: [],
  leftovers: [],
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

const SOURCE =
  "Hill Brute\nArmor Class 13\nHit Points 45\nChallenge 3\nSTR 18 (+4) DEX 8 (-1) CON 14 (+2) INT 6 (-2) WIS 9 (-1) CHA 7 (-2)";

describe("StatBlockImportModal steps", () => {
  it("shows the paste step with the privacy line and the counter", () => {
    const controller = new StatBlockImportController(deps());
    render(StatBlockImportModal, { props: { controller, onClose: vi.fn() } });
    expect(screen.getByTestId("stat-block-privacy").textContent).toContain(
      "It isn't kept.",
    );
    expect(screen.getByTestId("stat-block-counter").textContent).toContain(
      "12000",
    );
  });

  it("reads, reviews and saves a new creature", async () => {
    const controller = new StatBlockImportController(deps());
    controller.setSource(SOURCE);
    render(StatBlockImportModal, { props: { controller, onClose: vi.fn() } });
    await fireEvent.click(screen.getByTestId("stat-block-read"));
    await vi.waitFor(() => expect(controller.step).toBe("review"));
    expect(
      (screen.getByTestId("stat-block-save") as HTMLButtonElement).disabled,
    ).toBe(false);
    await fireEvent.click(screen.getByTestId("stat-block-save"));
    await vi.waitFor(() =>
      expect(screen.getByTestId("stat-block-step-saved")).toBeTruthy(),
    );
  });

  it("asks before overwriting and lists each replaced value", async () => {
    const existing = {
      id: "brute-1",
      title: "Hill Brute",
      labels: [],
      content: "",
      statSheet: {
        templateId: TOV_MONSTER_TEMPLATE_ID,
        fields: [{ id: "ac", label: "AC", type: "number", value: 10 }],
      },
    } as unknown as Entity;
    const controller = new StatBlockImportController(
      deps({ targetEntity: () => existing }),
    );
    controller.setSource(SOURCE);
    await controller.read();
    render(StatBlockImportModal, { props: { controller, onClose: vi.fn() } });
    await fireEvent.click(screen.getByTestId("stat-block-save"));
    const list = screen.getByTestId("stat-block-overwrites").textContent ?? "";
    expect(list).toContain("ac: 10 → 13");
    await fireEvent.click(screen.getByTestId("stat-block-confirm"));
    await vi.waitFor(() => expect(controller.step).toBe("saved"));
  });

  it("offers open, import-into and create-separate on a name clash", async () => {
    const clash = {
      id: "brute-2",
      title: "Hill Brute",
      labels: [],
      content: "",
    } as unknown as Entity;
    const controller = new StatBlockImportController(
      deps({ findEntityByTitle: () => clash }),
    );
    controller.setSource(SOURCE);
    await controller.read();
    const onOpenExisting = vi.fn();
    render(StatBlockImportModal, {
      props: { controller, onClose: vi.fn(), onOpenExisting },
    });
    await fireEvent.click(screen.getByTestId("stat-block-save"));
    expect(screen.getByTestId("stat-block-step-clash")).toBeTruthy();
    await fireEvent.click(screen.getByText("Open existing"));
    expect(onOpenExisting).toHaveBeenCalledWith("brute-2");
  });

  it("cancels from the review without writing", async () => {
    const d = deps();
    const controller = new StatBlockImportController(d);
    controller.setSource(SOURCE);
    await controller.read();
    const onClose = vi.fn();
    render(StatBlockImportModal, { props: { controller, onClose } });
    await fireEvent.click(screen.getByTestId("stat-block-cancel"));
    expect(onClose).toHaveBeenCalled();
    expect(d.createEntity).not.toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const controller = new StatBlockImportController(deps());
    const onClose = vi.fn();
    render(StatBlockImportModal, { props: { controller, onClose } });
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(controller.step).toBe("cancelled");
  });
});

describe("StatBlockImportModal focus", () => {
  it("moves focus into the dialog when it opens", async () => {
    const controller = new StatBlockImportController(deps());
    render(StatBlockImportModal, { props: { controller, onClose: vi.fn() } });
    const dialog = screen.getByTestId("stat-block-import-modal");
    // The focus trap moves focus on the next frame, so wait for it.
    await vi.waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
  });
});
