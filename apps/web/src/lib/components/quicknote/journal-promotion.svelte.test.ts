import { describe, it, expect } from "vitest";
import { JournalPromotionState } from "./journal-promotion.svelte";

describe("JournalPromotionState", () => {
  it("starts idle", () => {
    const state = new JournalPromotionState();
    expect(state.selecting).toBe(false);
    expect(state.hasSelection).toBe(false);
    expect(state.formScope).toBeUndefined();
  });

  it("chooses and unchooses entries and sections", () => {
    const state = new JournalPromotionState();
    state.startSelecting();

    state.toggleEntry("e1");
    state.toggleSection("s1");
    expect(state.isEntrySelected("e1")).toBe(true);
    expect(state.isSectionSelected("s1")).toBe(true);
    expect(state.hasSelection).toBe(true);
    expect(state.selectionScope()).toEqual({
      kind: "selection",
      entryIds: ["e1"],
      sectionIds: ["s1"],
    });

    state.toggleEntry("e1");
    state.toggleSection("s1");
    expect(state.hasSelection).toBe(false);
  });

  it("keeps a section and its entries independent (FR-036)", () => {
    const state = new JournalPromotionState();
    state.startSelecting();

    state.toggleSection("s1");
    expect(state.isEntrySelected("e2")).toBe(false);

    state.toggleEntry("e2");
    expect(state.isSectionSelected("s1")).toBe(true);
    state.toggleEntry("e2");
    expect(state.isSectionSelected("s1")).toBe(true);
  });

  it("opens the form for a scope and closes it again", () => {
    const state = new JournalPromotionState();
    expect(state.openForm({ kind: "journal" })).toBe(true);
    expect(state.formScope).toEqual({ kind: "journal" });

    state.closeForm();
    expect(state.formScope).toBeUndefined();
  });

  it("opens the form for a chosen selection", () => {
    const state = new JournalPromotionState();
    state.startSelecting();
    state.toggleEntry("e1");

    expect(state.openForm(state.selectionScope())).toBe(true);
    expect(state.formScope).toEqual({
      kind: "selection",
      entryIds: ["e1"],
      sectionIds: [],
    });
  });

  it("stopping selection clears the choices", () => {
    const state = new JournalPromotionState();
    state.startSelecting();
    state.toggleEntry("e1");

    state.stopSelecting();

    expect(state.selecting).toBe(false);
    expect(state.hasSelection).toBe(false);
  });

  it("reset clears everything", () => {
    const state = new JournalPromotionState();
    state.startSelecting();
    state.toggleEntry("e1");
    state.openForm({ kind: "journal" });

    state.reset();

    expect(state.selecting).toBe(false);
    expect(state.hasSelection).toBe(false);
    expect(state.formScope).toBeUndefined();
  });

  describe("refuses (negative)", () => {
    it("to open the form for an empty selection", () => {
      const state = new JournalPromotionState();
      state.startSelecting();

      expect(state.openForm(state.selectionScope())).toBe(false);
      expect(state.formScope).toBeUndefined();
    });

    it("to choose anything when not in selection mode", () => {
      const state = new JournalPromotionState();

      state.toggleEntry("e1");
      state.toggleSection("s1");

      expect(state.hasSelection).toBe(false);
      expect(state.isEntrySelected("e1")).toBe(false);
    });
  });
});
