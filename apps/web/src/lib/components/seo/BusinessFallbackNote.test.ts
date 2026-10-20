/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import BusinessFallbackNote from "./BusinessFallbackNote.svelte";

describe("BusinessFallbackNote", () => {
  it("renders nothing when every section came from AI", () => {
    const { container } = render(BusinessFallbackNote, {
      props: { fallbackSections: [] },
    });
    expect(container.textContent?.trim()).toBe("");
  });

  it("names the sections written from the tables in plain words", () => {
    render(BusinessFallbackNote, {
      props: {
        fallbackSections: [
          "pressure",
          "hooks",
          "staff:staff-1",
          "staff:staff-2",
        ],
      },
    });
    const note = screen.getByRole("status");
    expect(note.textContent).toMatch(/current pressure/);
    expect(note.textContent).toMatch(/adventure hooks/);
    expect(note.textContent?.match(/key staff/g)?.length).toBe(1);
  });

  it("lists names that appear without an introduction", () => {
    render(BusinessFallbackNote, {
      props: { fallbackSections: [], warnings: ["Edran Pell", "Nima Quill"] },
    });
    const note = screen.getByRole("status");
    expect(note.textContent).toMatch(/Edran Pell, Nima Quill/);
    expect(note.textContent).toMatch(/without being introduced/);
  });

  it("shows both notices when a part fell back and names are unintroduced", () => {
    render(BusinessFallbackNote, {
      props: { fallbackSections: ["pressure"], warnings: ["Edran Pell"] },
    });
    const note = screen.getByRole("status");
    expect(note.textContent).toMatch(/current pressure/);
    expect(note.textContent).toMatch(/Edran Pell/);
  });
});
