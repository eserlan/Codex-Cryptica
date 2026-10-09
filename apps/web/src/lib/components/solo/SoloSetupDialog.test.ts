/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const instance = vi.hoisted(() => ({
  soloSessionStore: {
    start: vi.fn(async (_setup: unknown) => {}),
  },
}));
vi.mock("$lib/stores/solo-session-instance", () => instance);

import SoloSetupDialog from "./SoloSetupDialog.svelte";

const characters = [
  { id: "kael", name: "Kael" },
  { id: "ivo", name: "Brother Ivo" },
];

const maps = [
  { id: "m1", name: "Greyhollow" },
  { id: "m2", name: "The Marsh" },
];

beforeEach(() => {
  instance.soloSessionStore.start.mockReset();
  instance.soloSessionStore.start.mockResolvedValue(undefined);
});

function renderDialog(
  props: Partial<{
    maps: typeof maps;
    characters: typeof characters;
    defaultMapId: string | null;
    journalState: "start" | "open" | "resume";
  }> = {},
) {
  const onclose = vi.fn();
  render(SoloSetupDialog, {
    props: {
      maps,
      characters,
      defaultMapId: "m2",
      journalState: "start",
      onclose,
      ...props,
    },
  });
  return { onclose };
}

describe("SoloSetupDialog", () => {
  it("keeps the dialog within the screen and scrolls a long party list", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: `c${i}`,
      name: `Character ${i}`,
    }));
    renderDialog({ characters: many });
    const dialog = screen.getByTestId("solo-setup-dialog");
    const body = screen.getByTestId("solo-setup-body");
    expect(dialog.className).toContain("max-h-full");
    expect(body.className).toContain("overflow-y-auto");
    // The scrolling body holds the list; the actions sit outside it.
    expect(body.contains(screen.getByText("Character 199"))).toBe(true);
    expect(body.contains(screen.getByTestId("solo-setup-start"))).toBe(false);
    expect(body.contains(screen.getByTestId("solo-setup-cancel"))).toBe(false);
  });

  it("lists the vault's maps plus No map, preselected to the default", () => {
    renderDialog();
    const select = screen.getByTestId("solo-setup-map") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) =>
      o.textContent?.trim(),
    );
    expect(options).toEqual(["Greyhollow", "The Marsh", "No map"]);
    expect(select.value).toBe("m2");
  });

  it("offers only No map in a vault with no maps", () => {
    renderDialog({ maps: [], defaultMapId: null });
    const select = screen.getByTestId("solo-setup-map") as HTMLSelectElement;
    expect(
      Array.from(select.options).map((o) => o.textContent?.trim()),
    ).toEqual(["No map"]);
    expect(select.value).toBe("");
  });

  it("starts a journal by default, labelled to start one", () => {
    renderDialog({ journalState: "start" });
    const journal = screen.getByTestId(
      "solo-setup-journal",
    ) as HTMLInputElement;
    expect(journal.checked).toBe(true);
    expect(screen.getByText("Start a Session Journal")).toBeTruthy();
  });

  it("offers to continue a running journal instead", () => {
    renderDialog({ journalState: "resume" });
    expect(
      screen.getByText(/Continue the running Session Journal/),
    ).toBeTruthy();
  });

  it("starts with the chosen values when Start is pressed", async () => {
    renderDialog();
    await fireEvent.click(screen.getByTestId("solo-setup-start"));
    await waitFor(() =>
      expect(instance.soloSessionStore.start).toHaveBeenCalledWith({
        mapId: "m2",
        journal: true,
      }),
    );
  });

  it("starts with no map and no journal when the player chooses those", async () => {
    renderDialog();
    await fireEvent.change(screen.getByTestId("solo-setup-map"), {
      target: { value: "" },
    });
    await fireEvent.click(screen.getByTestId("solo-setup-journal"));
    await fireEvent.click(screen.getByTestId("solo-setup-start"));
    await waitFor(() =>
      expect(instance.soloSessionStore.start).toHaveBeenCalledWith({
        mapId: null,
        journal: false,
      }),
    );
  });

  it("shows the reason and stays open when the start is refused", async () => {
    instance.soloSessionStore.start.mockRejectedValueOnce(
      new Error("End shared play to start a solo session."),
    );
    const { onclose } = renderDialog();
    await fireEvent.click(screen.getByTestId("solo-setup-start"));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/End shared play/),
    );
    expect(onclose).not.toHaveBeenCalled();
  });

  it("closes without starting when Cancel is pressed", async () => {
    const { onclose } = renderDialog();
    await fireEvent.click(screen.getByTestId("solo-setup-cancel"));
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(instance.soloSessionStore.start).not.toHaveBeenCalled();
  });

  it("closes on Escape when focus is outside the dialog", async () => {
    const { onclose } = renderDialog();
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onclose).toHaveBeenCalled();
  });

  it("offers an optional party picker of Character entities", () => {
    renderDialog();
    expect(screen.getByRole("checkbox", { name: "Kael" })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Brother Ivo" })).toBeTruthy();
    expect(
      (screen.getByRole("checkbox", { name: "Kael" }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it("starts with the chosen party", async () => {
    renderDialog({ defaultMapId: null });
    await fireEvent.click(screen.getByRole("checkbox", { name: "Kael" }));
    await fireEvent.click(screen.getByTestId("solo-setup-start"));
    await waitFor(() =>
      expect(instance.soloSessionStore.start).toHaveBeenCalledWith(
        expect.objectContaining({ partyIds: ["kael"] }),
      ),
    );
  });

  it("starts with no party when none is chosen", async () => {
    renderDialog({ defaultMapId: null });
    await fireEvent.click(screen.getByTestId("solo-setup-start"));
    await waitFor(() =>
      expect(instance.soloSessionStore.start).toHaveBeenCalled(),
    );
    expect(instance.soloSessionStore.start.mock.calls[0][0]).not.toHaveProperty(
      "partyIds",
    );
  });
});
