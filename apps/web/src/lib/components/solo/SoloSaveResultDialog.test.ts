/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  promoter: {
    promote: vi.fn(
      async (_j: unknown, _s: unknown, _i: unknown): Promise<any> => ({
        ok: true,
        entityId: "e1",
      }),
    ),
  },
  journal: {
    current: { id: "j1", status: "active", entries: [], sections: [] } as any,
  },
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloPromoter: env.promoter,
}));
vi.mock("$lib/stores/session-journal.svelte", () => ({
  sessionJournalStore: env.journal,
}));

import SoloSaveResultDialog from "./SoloSaveResultDialog.svelte";

const entry = {
  id: "e7",
  timestamp: 7,
  type: "generated-result",
  content: "Generated NPC: Mara One-Eye — a one-eyed smuggler",
  sourceRef: { generatorId: "npc" },
};
const categories = [
  "character",
  "location",
  "item",
  "faction",
  "event",
  "note",
];

beforeEach(() => {
  env.promoter.promote.mockClear();
  env.promoter.promote.mockResolvedValue({ ok: true, entityId: "e1" });
  env.journal.current = {
    id: "j1",
    status: "active",
    entries: [entry],
    sections: [],
  };
});

function renderDialog(overrides: Record<string, unknown> = {}) {
  const onclose = vi.fn();
  render(SoloSaveResultDialog, {
    props: { entry, categories, onclose, ...overrides },
  });
  return { onclose };
}

describe("SoloSaveResultDialog", () => {
  it("preselects the suggested category and prefills a name from the result", () => {
    renderDialog();
    const category = screen.getByTestId(
      "solo-save-category",
    ) as HTMLSelectElement;
    const name = screen.getByTestId("solo-save-name") as HTMLInputElement;
    expect(category.value).toBe("character");
    expect(name.value).toBe(
      "Generated NPC: Mara One-Eye — a one-eyed smuggler",
    );
  });

  it("saves with the chosen category and name through the solo promoter", async () => {
    const { onclose } = renderDialog();
    await fireEvent.input(screen.getByTestId("solo-save-name"), {
      target: { value: "Mara One-Eye" },
    });
    await fireEvent.click(screen.getByTestId("solo-save-confirm"));
    await waitFor(() =>
      expect(env.promoter.promote).toHaveBeenCalledWith(
        env.journal.current,
        { kind: "entry", entryId: "e7" },
        expect.objectContaining({ type: "character", title: "Mara One-Eye" }),
      ),
    );
    expect(onclose).toHaveBeenCalled();
  });

  it("refuses an empty name with a message and saves nothing", async () => {
    renderDialog();
    await fireEvent.input(screen.getByTestId("solo-save-name"), {
      target: { value: "   " },
    });
    await fireEvent.click(screen.getByTestId("solo-save-confirm"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(env.promoter.promote).not.toHaveBeenCalled();
  });

  it("shows a failure and keeps the dialog open with the inputs intact", async () => {
    env.promoter.promote.mockResolvedValueOnce({
      ok: false,
      error: "That could not be made into an entity. Please try again.",
    });
    const { onclose } = renderDialog();
    await fireEvent.input(screen.getByTestId("solo-save-name"), {
      target: { value: "Mara" },
    });
    await fireEvent.click(screen.getByTestId("solo-save-confirm"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(onclose).not.toHaveBeenCalled();
    expect(
      (screen.getByTestId("solo-save-name") as HTMLInputElement).value,
    ).toBe("Mara");
  });

  it("closes without saving on Cancel and on Escape", async () => {
    const { onclose } = renderDialog();
    await fireEvent.click(screen.getByTestId("solo-save-cancel"));
    expect(onclose).toHaveBeenCalledTimes(1);
    await fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onclose).toHaveBeenCalledTimes(2);
    expect(env.promoter.promote).not.toHaveBeenCalled();
  });

  it("refuses a second save while one is in flight", async () => {
    let finish: (v: unknown) => void = () => {};
    env.promoter.promote.mockImplementationOnce(
      () => new Promise((r) => (finish = r)) as any,
    );
    renderDialog();
    await fireEvent.input(screen.getByTestId("solo-save-name"), {
      target: { value: "Mara" },
    });
    await fireEvent.click(screen.getByTestId("solo-save-confirm"));
    await fireEvent.click(screen.getByTestId("solo-save-confirm"));
    expect(env.promoter.promote).toHaveBeenCalledTimes(1);
    finish({ ok: true, entityId: "e1" });
  });
});
