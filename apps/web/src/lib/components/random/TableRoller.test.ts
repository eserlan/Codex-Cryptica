/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { RandomSource, RollOutcome } from "random-source-engine";

import TableRoller from "./TableRoller.svelte";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({ finished: Promise.resolve(), cancel: () => {} }) as Animation;
}

const source: RandomSource = {
  id: "table-1",
  name: "Complications",
  kind: "table",
  labels: [],
  selection: { mode: "ranged", die: { sides: 6 } },
  entries: [
    { id: "entry-1", text: "The bridge collapses", range: { min: 1, max: 6 } },
  ],
};

const outcome: RollOutcome = {
  finalText: "The bridge collapses",
  chain: [
    {
      sourceName: source.name,
      sourceKind: "table",
      dieValue: 3,
      text: "The bridge collapses",
      children: [],
      status: "ok",
    },
  ],
  notices: [],
};

function renderRoller(overrides: Record<string, unknown> = {}) {
  return render(TableRoller, {
    props: {
      source,
      sources: {
        roll: vi.fn(() => outcome),
        rerollFragment: vi.fn(),
      },
      history: { addResult: vi.fn() },
      ...overrides,
    } as never,
  });
}

describe("TableRoller result actions", () => {
  it("sends a rolled result to chat and copies its plain text", async () => {
    const addToChat = vi.fn(async () => {});
    const copyText = vi.fn(async () => {});
    renderRoller({ addToChat, copyText });

    await fireEvent.click(screen.getByTestId("roll-table"));
    await fireEvent.click(screen.getByTestId("add-roll-result-to-chat"));
    await fireEvent.click(screen.getByTestId("copy-roll-result"));

    await waitFor(() =>
      expect(addToChat).toHaveBeenCalledWith("The bridge collapses"),
    );
    expect(copyText).toHaveBeenCalledWith("The bridge collapses");
    expect(screen.getByTestId("copy-roll-result").textContent).toContain(
      "Copied",
    );
  });

  it("keeps the copy action available when clipboard access fails", async () => {
    const copyText = vi.fn(async () => {
      throw new Error("Permission denied");
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderRoller({ copyText });

    await fireEvent.click(screen.getByTestId("roll-table"));
    await fireEvent.click(screen.getByTestId("copy-roll-result"));

    await waitFor(() => expect(copyText).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("copy-roll-result").textContent).toContain(
      "Copy",
    );
    consoleError.mockRestore();
  });
});
