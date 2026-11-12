import { describe, expect, it, vi } from "vitest";
import {
  createEntityActions,
  type EntityActionsDeps,
  type EntityActionsInput,
} from "./entity-actions.svelte.js";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

const makeDeps = (
  overrides: Partial<EntityActionsDeps> = {},
): Partial<EntityActionsDeps> => ({
  notify: vi.fn(),
  openZen: vi.fn(),
  openRevision: vi.fn(),
  isRevising: () => false,
  findInGraph: vi.fn(),
  shelve: vi.fn(async () => true),
  copyLink: vi.fn(async () => undefined),
  openGuestChat: vi.fn(),
  openSoundBite: vi.fn(),
  openCanvas: vi.fn(),
  buildDelveCanvas: vi.fn(async () => ({ slug: "built" })),
  delveLabel: () => "Delve Map",
  ...overrides,
});

const ownerInput = (
  extra: Partial<EntityActionsInput> = {},
  entity: Record<string, unknown> = {},
): EntityActionsInput => ({
  entity: { id: "e1", title: "Thing", type: "note", ...entity } as any,
  isGuest: false,
  isGraphView: true,
  canGuestEdit: false,
  onStartEdit: vi.fn(),
  onDelete: vi.fn(),
  ...extra,
});

const ids = (input: EntityActionsInput, deps = makeDeps()) =>
  createEntityActions(() => input, deps).actions.map((a) => a.id);

describe("createEntityActions", () => {
  it("gives an owner on the graph Edit, Find in graph and Expand first", () => {
    const actions = createEntityActions(() => ownerInput(), makeDeps()).actions;
    const primary = actions.filter((a) => a.placement === "primary");
    expect(primary.map((a) => a.id)).toEqual([
      "edit",
      "find-in-graph",
      "expand",
    ]);
  });

  it("gives a guest no Edit, Delete, Shelf or AI revise, and Copy link when published", () => {
    const list = ids(
      ownerInput({ isGuest: true, publishId: "pub-1" }),
      makeDeps(),
    );
    expect(list).toEqual(["copy-link", "find-in-graph", "expand"]);
  });

  it("gives a character Chat only when chatting is on and has instructions", () => {
    const guest = (config: unknown) =>
      ids(
        ownerInput(
          { isGuest: true },
          { type: "character", guestChatConfig: config },
        ),
      );
    expect(guest({ isEnabled: true, extraInstructions: "Be gruff" })).toContain(
      "chat",
    );
    expect(guest({ isEnabled: true, extraInstructions: "  " })).not.toContain(
      "chat",
    );
    expect(guest(undefined)).not.toContain("chat");
    expect(
      ids(
        ownerInput(
          {},
          {
            type: "character",
            guestChatConfig: { isEnabled: true, extraInstructions: "x" },
          },
        ),
      ),
    ).not.toContain("chat");
  });

  it("offers the delve map for a delve location, to build then to open", () => {
    const entity = { type: "location", kind: "dungeon" };
    const build = createEntityActions(
      () => ownerInput({}, entity),
      makeDeps(),
    ).actions.find((a) => a.id === "delve-map");
    expect(build?.label).toBe("Build Delve Map");
    const open = createEntityActions(
      () => ownerInput({ existingCanvas: { slug: "s" } }, entity),
      makeDeps(),
    ).actions.find((a) => a.id === "delve-map");
    expect(open?.label).toBe("Open Delve Map");
  });

  it("puts Delete last, in the danger tone", () => {
    const actions = createEntityActions(
      () => ownerInput({}, { type: "creature" }),
      makeDeps(),
    ).actions;
    const last = actions[actions.length - 1];
    expect(last.id).toBe("delete");
    expect(last.tone).toBe("danger");
    expect(actions.filter((a) => a.tone === "danger")).toHaveLength(1);
  });

  it("gives an owner the image actions in the menu, with Delete still last", () => {
    const actions = createEntityActions(
      () =>
        ownerInput({
          onChangeImage: vi.fn(),
          onChooseSilhouette: vi.fn(),
          onShowToGuests: vi.fn(),
        }),
      makeDeps(),
    ).actions;
    for (const id of [
      "change-image",
      "choose-silhouette",
      "show-image-to-guests",
    ]) {
      expect(actions.find((a) => a.id === id)?.placement).toBe("menu");
    }
    expect(actions[actions.length - 1].id).toBe("delete");
    const icons = actions.map((a) => a.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("runs the image callbacks", async () => {
    const onChangeImage = vi.fn();
    const actions = createEntityActions(
      () => ownerInput({ onChangeImage }),
      makeDeps(),
    ).actions;
    await actions.find((a) => a.id === "change-image")?.run();
    expect(onChangeImage).toHaveBeenCalledTimes(1);
  });

  it("gives a guest no image actions even with the callbacks", () => {
    const list = ids(
      ownerInput({
        isGuest: true,
        onChangeImage: vi.fn(),
        onChooseSilhouette: vi.fn(),
        onShowToGuests: vi.fn(),
      }),
    );
    expect(list).not.toContain("change-image");
    expect(list).not.toContain("choose-silhouette");
    expect(list).not.toContain("show-image-to-guests");
  });

  it("leaves out Show image to guests without its callback", () => {
    const list = ids(
      ownerInput({ onChangeImage: vi.fn(), onChooseSilhouette: vi.fn() }),
    );
    expect(list).toContain("change-image");
    expect(list).not.toContain("show-image-to-guests");
  });

  it("leaves out Find in graph off the graph route", () => {
    expect(ids(ownerInput({ isGraphView: false }))).not.toContain(
      "find-in-graph",
    );
  });

  it("leaves out Edit and Delete when no callbacks are given", () => {
    const list = ids(
      ownerInput({ onStartEdit: undefined, onDelete: undefined }),
    );
    expect(list).not.toContain("edit");
    expect(list).not.toContain("delete");
  });

  it("never repeats an icon", () => {
    const actions = createEntityActions(
      () => ownerInput({}, { type: "creature", soundBite: "x" }),
      makeDeps(),
    ).actions;
    const icons = actions.map((a) => a.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("marks MonsterLabs busy and disabled while its flow runs", () => {
    const actions = createEntityActions(
      () =>
        ownerInput(
          { monsterLabsLoading: true, monsterLabsOpen: true },
          { type: "creature" },
        ),
      makeDeps(),
    ).actions;
    const item = actions.find((a) => a.id === "monsterlabs");
    expect(item?.state).toBe("busy");
    expect(item?.disabled).toBe(true);
  });

  it("shows Copy link as done after a success, then reverts", async () => {
    vi.useFakeTimers();
    const model = createEntityActions(
      () => ownerInput({ isGuest: true, publishId: "pub" }),
      makeDeps(),
    );
    await model.actions.find((a) => a.id === "copy-link")!.run();
    expect(model.actions.find((a) => a.id === "copy-link")?.state).toBe("done");
    vi.advanceTimersByTime(2100);
    expect(model.actions.find((a) => a.id === "copy-link")?.state).toBe(
      undefined,
    );
    vi.useRealTimers();
  });

  it("tells the user, never throws, when an action fails", async () => {
    const deps = makeDeps({
      copyLink: vi.fn(async () => {
        throw new Error("blocked");
      }),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const model = createEntityActions(
      () => ownerInput({ isGuest: true, publishId: "pub" }),
      deps,
    );
    await expect(
      model.actions.find((a) => a.id === "copy-link")!.run(),
    ).resolves.toBeUndefined();
    expect(deps.notify).toHaveBeenCalledWith(
      "Could not copy the link.",
      "error",
    );
    expect(model.actions.find((a) => a.id === "copy-link")?.state).toBe(
      undefined,
    );
  });

  it("reports a failed delve map build", async () => {
    const deps = makeDeps({
      buildDelveCanvas: vi.fn(async () => {
        throw new Error("nope");
      }),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const delve = createEntityActions(
      () => ownerInput({}, { type: "location", kind: "dungeon" }),
      deps,
    ).actions.find((a) => a.id === "delve-map");
    await delve!.run();
    expect(deps.notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("notifies when sending to the Shelf fails", async () => {
    const deps = makeDeps({ shelve: vi.fn(async () => false) });
    const model = createEntityActions(
      () => ownerInput({}, { type: "note" }),
      deps,
    );
    await model.actions.find((action) => action.id === "shelf")!.run();
    expect(deps.notify).toHaveBeenCalledWith(
      "Could not send this to the Shelf.",
      "error",
    );
    expect(model.actions.find((action) => action.id === "shelf")?.state).toBe(
      undefined,
    );
  });

  it("marks Shelf as done after a successful send", async () => {
    const deps = makeDeps({ shelve: vi.fn(async () => true) });
    const model = createEntityActions(
      () => ownerInput({}, { type: "note" }),
      deps,
    );
    await model.actions.find((action) => action.id === "shelf")!.run();
    expect(deps.shelve).toHaveBeenCalledWith("e1");
    expect(model.actions.find((action) => action.id === "shelf")?.state).toBe(
      "done",
    );
  });
});
