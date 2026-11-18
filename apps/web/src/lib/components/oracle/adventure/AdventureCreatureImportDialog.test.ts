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
      visibility: "player-visible",
      epistemicStatus: "source-stated",
    },
    {
      id: "a2",
      name: "Spider",
      summary: "Hoards treasure",
      visibility: "gm-only",
      epistemicStatus: "source-stated",
    },
    {
      id: "a3",
      name: "Wolf",
      summary: "A guard",
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
  it("reviews, previews and writes only on confirm", async () => {
    const { createEntity } = setup();
    expect(screen.getByRole("dialog", { name: "Create creature entries" }));
    expect(screen.getByText(/Already in your Vault: wolf/)).toBeTruthy();
    expect(screen.getAllByText(/Gate\s+\(Page not given\)/).length).toBe(3);
    await fireEvent.click(
      screen.getByRole("button", { name: "Review changes" }),
    );
    expect(
      screen.getByText(/2 entries will be created, and 1 reused/),
    ).toBeTruthy();
    expect(screen.getByText(/Create Spider: hidden, no image/)).toBeTruthy();
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
