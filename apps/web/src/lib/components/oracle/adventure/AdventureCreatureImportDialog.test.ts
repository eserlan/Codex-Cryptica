import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type {
  AdventureJsonV1,
  StoredAdventurePackage,
} from "@codex/adventure-engine";
import AdventureCreatureImportDialog from "./AdventureCreatureImportDialog.svelte";

const pkg = {
  id: "lair",
  version: "1.0.0",
  source: { title: "The Lair" },
  actors: [
    {
      id: "a1",
      name: "Gnoll",
      summary: "A raider",
      aliases: ["The Gnoll, Raider", "Gnoll Captain"],
      labels: ["raider, border guard", "patrol"],
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
    {
      id: "a2",
      name: "Spider",
      summary: "Hoards treasure",
      aliases: ["Web Queen"],
      labels: ["danger", "hidden"],
      visibility: "gm-only",
      epistemicStatus: "source-stated",
    },
    {
      id: "a3",
      name: "Wolf",
      summary: "A guard",
      aliases: ["The Wolf"],
      labels: ["beast"],
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
  ],
  encounters: [
    {
      id: "e1",
      title: "Gate",
      description: "",
      actorIds: ["a1", "a2", "a3"],
      alternativeSolutions: [],
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
  ],
} as unknown as AdventureJsonV1;
const item = {
  hash: "h".repeat(64),
  path: "p",
  originFormat: "adventure-json/v1",
  package: pkg,
} as StoredAdventurePackage;

function setup() {
  const createEntity = vi.fn(
    async (_t: string, title: string) => `id-${title}`,
  );
  const environment = {
    importDeps: {
      getVaultId: () => "v1",
      createEntity,
      saveImage: vi.fn(async () => ({ ok: true as const })),
    },
    listCreatures: () => [{ id: "w", title: "wolf" }],
  };
  const onClose = vi.fn();
  render(AdventureCreatureImportDialog, { item, environment, onClose });
  return { createEntity, onClose };
}

describe("creature import dialog", () => {
  it("describes creature actors without encounter links", () => {
    const unlinkedPackage = {
      ...pkg,
      actors: [
        {
          id: "unlinked-creature",
          name: "Unlinked Creature",
          kind: "creature",
          visibility: "player-visible",
          epistemicStatus: "source-stated",
        },
      ],
      encounters: [],
    } as unknown as AdventureJsonV1;
    render(AdventureCreatureImportDialog, {
      item: { ...item, package: unlinkedPackage },
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity: vi.fn(async () => "id"),
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
    });

    expect(
      screen.getByText(
        "Creature actors from this adventure. Encounter links are shown when available. Nothing is saved until you confirm.",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("creature-import-item-0")).queryAllByRole(
        "listitem",
      ),
    ).toHaveLength(0);
  });

  it("reviews, previews and writes only on confirm", async () => {
    const { createEntity } = setup();
    expect(screen.getByRole("dialog", { name: "Create creature entries" }));
    expect(screen.getByText(/Already in your Vault: wolf/)).toBeTruthy();
    expect(screen.getAllByText(/Gate\s+\(Page not given\)/).length).toBe(3);
    const gnollReview = within(screen.getByTestId("creature-import-item-0"));
    expect(gnollReview.getByText("Aliases", { exact: true })).toBeTruthy();
    expect(
      gnollReview.getByText("The Gnoll, Raider", { exact: true }),
    ).toBeTruthy();
    expect(
      gnollReview.getByText("Gnoll Captain", { exact: true }),
    ).toBeTruthy();
    expect(gnollReview.getByText("Labels", { exact: true })).toBeTruthy();
    expect(
      gnollReview.getByText("raider, border guard", { exact: true }),
    ).toBeTruthy();
    expect(gnollReview.getByText("patrol", { exact: true })).toBeTruthy();
    expect(
      gnollReview.queryByText("Aliases: The Gnoll, Raider, Gnoll Captain"),
    ).toBeNull();
    const spiderReview = within(screen.getByTestId("creature-import-item-1"));
    expect(spiderReview.getByText("Web Queen", { exact: true })).toBeTruthy();
    expect(spiderReview.getByText("danger", { exact: true })).toBeTruthy();
    expect(spiderReview.getByText("hidden", { exact: true })).toBeTruthy();
    const wolfReview = within(screen.getByTestId("creature-import-item-2"));
    expect(wolfReview.queryByText(/Aliases:|Labels:/)).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    expect(
      screen.getByText(/2 entries will be created, and 1 reused/),
    ).toBeTruthy();
    expect(screen.getByText(/Create Spider: hidden, no image/)).toBeTruthy();
    expect(screen.getByText("The Gnoll, Raider", { exact: true })).toBeTruthy();
    expect(screen.getByText("Gnoll Captain", { exact: true })).toBeTruthy();
    expect(
      screen.getByText("raider, border guard", { exact: true }),
    ).toBeTruthy();
    expect(screen.getByText("patrol", { exact: true })).toBeTruthy();
    expect(screen.getByText("Web Queen", { exact: true })).toBeTruthy();
    expect(screen.getByText("danger", { exact: true })).toBeTruthy();
    expect(screen.getByText("hidden", { exact: true })).toBeTruthy();
    expect(
      screen.queryByText("Aliases: The Gnoll, Raider, Gnoll Captain"),
    ).toBeNull();
    expect(screen.getByText("Reuse wolf")).toBeTruthy();
    expect(createEntity).not.toHaveBeenCalled();
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm and create" }),
    );
    expect(await screen.findByText(/Created 2, reused 1/)).toBeTruthy();
    expect(createEntity).toHaveBeenCalledTimes(2);
  });

  it("writes nothing when cancelled at review or preview", async () => {
    const { createEntity, onClose } = setup();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(createEntity).not.toHaveBeenCalled();
  });

  it("skips an excluded proposal", async () => {
    const { createEntity } = setup();
    await fireEvent.click(
      within(
        screen.getByRole("radiogroup", { name: "Choice for Gnoll" }),
      ).getByRole("radio", { name: "Skip" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm and create" }),
    );
    await screen.findByText(/Created 1/);
    expect(createEntity).toHaveBeenCalledTimes(1);
  });

  it("disables Review changes when nothing is included", async () => {
    setup();
    for (const name of ["Gnoll", "Spider", "Wolf"]) {
      await fireEvent.click(
        within(
          screen.getByRole("radiogroup", { name: `Choice for ${name}` }),
        ).getByRole("radio", { name: "Skip" }),
      );
    }
    expect(
      (
        screen.getByRole("button", {
          name: "Review changes",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.getByText("Include at least one creature.")).toBeTruthy();
  });

  it("ignores Close and Escape while writing", async () => {
    let release!: (id: string) => void;
    const onClose = vi.fn();
    const environment = {
      importDeps: {
        getVaultId: () => "v1",
        createEntity: vi.fn(
          () => new Promise<string>((resolve) => (release = resolve)),
        ),
        saveImage: vi.fn(async () => ({ ok: true as const })),
      },
      listCreatures: () => [],
    };
    render(AdventureCreatureImportDialog, { item, environment, onClose });
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm and create" }),
    );
    expect(
      (screen.getByRole("button", { name: "Close" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    release("x");
  });

  it("moves focus to the heading when the step changes", async () => {
    setup();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await vi.waitFor(() =>
      expect(document.activeElement?.id).toBe("creature-import-title"),
    );
    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    screen
      .getByRole("heading", { name: "Review changes" })
      .dispatchEvent(shiftTab);
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Confirm and create" }),
    );
  });

  it("requires large imports to be confirmed in batches of at most 100 new entries", async () => {
    const actors = Array.from({ length: 101 }, (_, index) => ({
      id: `actor-${index}`,
      name: `Creature ${index}`,
      summary: "A creature",
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    }));
    const largePackage = {
      ...pkg,
      actors,
      encounters: [
        { ...pkg.encounters[0], actorIds: actors.map((actor) => actor.id) },
      ],
    } as unknown as AdventureJsonV1;
    const createEntity = vi.fn(async () => "id");
    render(AdventureCreatureImportDialog, {
      item: { ...item, package: largePackage },
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity,
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    expect(
      screen.getByText(/Create up to 100 new entries at a time/),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirm and create",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(createEntity).not.toHaveBeenCalled();
  });

  it("pages encounter references so only ten rows render at once", async () => {
    const encounters = Array.from({ length: 25 }, (_, index) => ({
      ...pkg.encounters[0],
      id: `encounter-${index}`,
      title: `Encounter ${index}`,
      actorIds: ["a1"],
    }));
    const densePackage = {
      ...pkg,
      actors: [pkg.actors[0]],
      encounters,
    } as unknown as AdventureJsonV1;
    render(AdventureCreatureImportDialog, {
      item: { ...item, package: densePackage },
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity: vi.fn(async () => "id"),
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
    });
    const creature = screen.getByTestId("creature-import-item-0");
    const encounterRows = () => {
      const firstEncounter =
        within(creature).getAllByText(/^Encounter \d+/)[0]!;
      const encounterList = firstEncounter.closest("ul");
      expect(encounterList).not.toBeNull();
      return within(encounterList!).getAllByRole("listitem");
    };
    expect(encounterRows()).toHaveLength(10);
    expect(within(creature).getByText("Encounters 1–10 of 25")).toBeTruthy();
    await fireEvent.click(
      within(creature).getByRole("button", { name: "Next encounters" }),
    );
    expect(encounterRows()).toHaveLength(10);
    expect(within(creature).getByText("Encounters 11–20 of 25")).toBeTruthy();
    expect(within(creature).getByText(/^Encounter 10/)).toBeTruthy();
    await fireEvent.click(
      within(creature).getByRole("button", { name: "Next encounters" }),
    );
    expect(encounterRows()).toHaveLength(5);
    expect(within(creature).getByText("Encounters 21–25 of 25")).toBeTruthy();
    expect(within(creature).getByText(/^Encounter 24/)).toBeTruthy();
  });

  it("keeps keyboard focus inside the dialog while writes are pending", async () => {
    let releaseCreate!: (id: string) => void;
    const createEntity = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<string>((resolve) => (releaseCreate = resolve)),
      )
      .mockResolvedValue("created-id");
    const onBusyChange = vi.fn();
    render(AdventureCreatureImportDialog, {
      item,
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity,
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
      onBusyChange,
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Confirm and create" }),
    );
    const status = await screen.findByText("Creating entries…");
    expect(document.activeElement).toBe(status);
    expect(onBusyChange).toHaveBeenCalledWith(true);
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    status.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(status);
    releaseCreate("created-id");
    expect(await screen.findByText(/Created 3, reused 0/)).toBeTruthy();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it("shows disjoint source pages without presenting them as a range", () => {
    const pagePackage = {
      ...pkg,
      actors: [
        { ...pkg.actors[0], sourceRef: { page: 2 } },
        {
          ...pkg.actors[0],
          id: "a1-copy",
          name: "Gnoll",
          sourceRef: { page: 4 },
        },
      ],
      encounters: [{ ...pkg.encounters[0], actorIds: ["a1", "a1-copy"] }],
    } as unknown as AdventureJsonV1;
    render(AdventureCreatureImportDialog, {
      item: { ...item, package: pagePackage },
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity: vi.fn(async () => "id"),
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
    });
    expect(screen.getByText("Pages 2, 4")).toBeTruthy();
  });

  it("paginates large proposal reviews while keeping every choice available", async () => {
    const actors = Array.from({ length: 25 }, (_, index) => ({
      id: `actor-${index}`,
      name: `Creature ${index}`,
      summary: "A creature",
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    }));
    const largePackage = {
      ...pkg,
      actors,
      encounters: [
        { ...pkg.encounters[0], actorIds: actors.map((actor) => actor.id) },
      ],
    } as unknown as AdventureJsonV1;
    render(AdventureCreatureImportDialog, {
      item: { ...item, package: largePackage },
      environment: {
        importDeps: {
          getVaultId: () => "v1",
          createEntity: vi.fn(async () => "id"),
          saveImage: vi.fn(async () => ({ ok: true as const })),
        },
        listCreatures: () => [],
      },
      onClose: vi.fn(),
    });
    expect(screen.getByText("Showing 1–20 of 25 creatures")).toBeTruthy();
    expect(screen.queryByText("Creature 24")).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Next creatures" }),
    );
    expect(screen.getByText("Creature 24")).toBeTruthy();
    expect(screen.getByText("Showing 21–25 of 25 creatures")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    expect(screen.getByText("Showing changes 1–20 of 25")).toBeTruthy();
    expect(screen.queryByText(/Create Creature 24:/)).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Next changes" }));
    expect(screen.getByText("Showing changes 21–25 of 25")).toBeTruthy();
    expect(screen.getByText(/Create Creature 24:/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Previous changes" }),
    );
    expect(screen.getByText("Showing changes 1–20 of 25")).toBeTruthy();
  });

  it("restores focus to the opener when closed", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Create creature entries";
    document.body.appendChild(opener);
    opener.focus();
    const environment = {
      importDeps: {
        getVaultId: () => "v1",
        createEntity: vi.fn(async () => "id"),
        saveImage: vi.fn(async () => ({ ok: true as const })),
      },
      listCreatures: () => [],
    };
    const { unmount } = render(AdventureCreatureImportDialog, {
      item,
      environment,
      onClose: () => unmount(),
    });
    expect(document.activeElement).not.toBe(opener);
    await fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
