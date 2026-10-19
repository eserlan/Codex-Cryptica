import { describe, expect, it } from "vitest";
import type { Token } from "../../../types/vtt";
import {
  collapsedNoteSize,
  noteDefaults,
  noteCollapseUpdate,
} from "./vtt-token-notes";

const note = { id: "note", kind: "note", width: 90, height: 120 } as Token;

describe("token notes", () => {
  it("starts unsized notes as markers with an expanded size to restore", () => {
    expect(noteDefaults({ name: "Note", x: 0, y: 0 }, 50)).toEqual({
      width: 25,
      height: 25,
      noteBody: "",
      noteCollapsedFrom: { width: 75, height: 75 },
    });
    expect(collapsedNoteSize(10)).toBe(16);
  });

  it("leaves explicitly sized notes open and preserves authored text", () => {
    expect(
      noteDefaults(
        { name: "Note", x: 0, y: 0, width: 90, noteBody: "Clue" },
        50,
      ),
    ).toEqual({
      width: 90,
      height: 75,
      noteBody: "Clue",
      noteCollapsedFrom: undefined,
    });
  });

  it("folds and unfolds using the original dimensions", () => {
    const update = noteCollapseUpdate(note, 50)!;
    expect(update).toEqual({
      width: 25,
      height: 25,
      noteCollapsedFrom: { width: 90, height: 120 },
    });
    expect(noteCollapseUpdate({ ...note, ...update }, 50)).toEqual({
      width: 90,
      height: 120,
      noteCollapsedFrom: undefined,
    });
  });

  it("rejects missing records and non-note tokens", () => {
    expect(noteCollapseUpdate(undefined, 50)).toBeNull();
    expect(noteCollapseUpdate({ ...note, kind: "token" }, 50)).toBeNull();
  });
});
