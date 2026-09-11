import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import TableStagingPreview from "./TableStagingPreview.svelte";
import type { CandidateTableEntry } from "generator-engine";

describe("TableStagingPreview", () => {
  const initialCandidates: CandidateTableEntry[] = [
    {
      id: "c-1",
      text: "A street peddler offering counterfeit artifacts",
      weight: 1,
      selected: true,
    },
    {
      id: "c-2",
      text: "A sudden {storm_surge} hits the docks",
      weight: 1,
      matchedSubTables: ["storm_surge"],
      selected: true,
    },
  ];

  it("renders candidate rows with checkboxes and inline editable text", () => {
    render(TableStagingPreview, {
      props: {
        candidates: initialCandidates,
        selectionMode: "weighted",
        onAccept: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(
      screen.getByDisplayValue(
        "A street peddler offering counterfeit artifacts",
      ),
    ).toBeDefined();
    expect(
      screen.getByDisplayValue("A sudden {storm_surge} hits the docks"),
    ).toBeDefined();
    expect(screen.getByText("{storm_surge}")).toBeDefined();
  });

  it("allows toggling row selection and selecting/deselecting all", async () => {
    render(TableStagingPreview, {
      props: {
        candidates: initialCandidates,
        selectionMode: "weighted",
        onAccept: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    const deselectAllBtn = screen.getByTestId("staging-deselect-all");
    await fireEvent.click(deselectAllBtn);

    const acceptBtn = screen.getByTestId(
      "staging-accept-btn",
    ) as HTMLButtonElement;
    expect(acceptBtn.disabled).toBe(true);

    const selectAllBtn = screen.getByTestId("staging-select-all");
    await fireEvent.click(selectAllBtn);
    expect(acceptBtn.disabled).toBe(false);
  });

  it("calls onAccept with selected and edited rows", async () => {
    const onAccept = vi.fn();
    render(TableStagingPreview, {
      props: {
        candidates: initialCandidates,
        selectionMode: "weighted",
        onAccept,
        onCancel: vi.fn(),
      },
    });

    const acceptBtn = screen.getByTestId("staging-accept-btn");
    await fireEvent.click(acceptBtn);

    expect(onAccept).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "c-1",
          text: "A street peddler offering counterfeit artifacts",
        }),
        expect.objectContaining({
          id: "c-2",
          text: "A sudden {storm_surge} hits the docks",
        }),
      ]),
    );
  });
});
