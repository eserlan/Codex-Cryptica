/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TokenDetail from "./TokenDetail.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {} as Record<string, any>,
    isGuest: false,
    updateEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: {
    isGMMode: false,
    activeMapId: "map-1",
    // Sized, because the note-collapse path clamps against the map bounds.
    activeMap: {
      id: "map-1",
      name: "Crypt of the Sun",
      dimensions: { width: 2000, height: 2000 },
    },
  },
}));

const oracleMock = vi.hoisted(() => ({ isEnabled: true }));
vi.mock("$lib/stores/oracle.svelte", () => ({ oracle: oracleMock }));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { worldThemeId: "fantasy" },
}));

const notifyMock = vi.hoisted(() => vi.fn());
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: notifyMock, confirm: vi.fn() },
}));

const generateNoteEncounterMock = vi.hoisted(() =>
  vi.fn(async () => ({ body: "Three cultists mid-ritual", aiFallback: false })),
);
vi.mock("$lib/services/vtt/note-encounter", () => ({
  generateNoteEncounter: generateNoteEncounterMock,
}));

describe("TokenDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).entities = {};
    mapSession.clearSession();
    mapSession.bindToMap("map-1");
    mapSession.setVttEnabled(true);
    mapSession.tokens = {
      "token-1": {
        id: "token-1",
        entityId: null,
        name: "Goblin",
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: 0,
        ownerPeerId: null,
        ownerGuestName: null,
        visibleTo: "all",
        color: "#f59e0b",
        imageUrl: null,
        statusEffects: [],
      } as any,
    };
    mapSession.setSelection("token-1");
  });

  it("hides management and metadata blocks for guests", async () => {
    sessionModeStore.isGuestMode = true;
    mapStore.isGMMode = false;
    mapSession.tokens["token-1"].entityId = "entity-1";

    render(TokenDetail);

    await waitFor(() => expect(screen.getByText("Goblin")).toBeTruthy());

    expect(screen.queryByRole("button", { name: "Remove Token" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add to Initiative" }),
    ).toBeNull();
    expect(screen.queryByText("Linked Entity")).toBeNull();
    expect(screen.queryByText("Owner")).toBeNull();
    expect(screen.queryByText("Read-only view for guests")).toBeNull();
  });

  it("shows the linked entity and its favorited quick stats to guests", async () => {
    sessionModeStore.isGuestMode = true;
    mapStore.isGMMode = false;
    mapSession.tokens["token-1"].entityId = "entity-1";
    (vault as any).entities = {
      "entity-1": {
        id: "entity-1",
        title: "Goblin",
        type: "npc",
        statSheet: {
          fields: [
            {
              id: "hp",
              label: "Hit Points",
              type: "counter",
              value: 5,
              favorite: true,
            },
          ],
        },
      },
    };

    render(TokenDetail);

    await waitFor(() => expect(screen.getByText("Linked Entity")).toBeTruthy());
    expect(screen.getByTestId("token-quick-stats")).toBeTruthy();
    expect(screen.getByText("Hit Points")).toBeTruthy();
    // Management controls stay GM-only even though the entity info is now shared.
    expect(screen.queryByRole("button", { name: "Remove Token" })).toBeNull();
  });

  it("removes the token directly in GM mode", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    render(TokenDetail);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove Token" })).toBeTruthy(),
    );

    await fireEvent.click(screen.getByRole("button", { name: "Remove Token" }));

    await waitFor(() => expect(mapSession.tokens["token-1"]).toBeUndefined());
  });

  it("shows a host-only reveal button for tokens with an image", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    const revealSpy = vi.spyOn(mapSession, "showTokenImageToPlayers");
    mapSession.tokens["token-1"].imageUrl = "images/goblin.webp";

    render(TokenDetail);

    const button = await screen.findByRole("button", {
      name: "Show token image to players",
    });
    await fireEvent.click(button);

    expect(revealSpy).toHaveBeenCalledWith("token-1");
  });

  it("edits a note's body in place and hides the freeform-marker fallback", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "2 goblins";

    render(TokenDetail);

    const textarea = (await screen.findByTestId(
      "token-note-body",
    )) as HTMLTextAreaElement;
    expect(textarea.value).toBe("2 goblins");
    expect(screen.queryByText("Freeform marker")).toBeNull();

    await fireEvent.input(textarea, {
      target: { value: "2 goblins, one asleep" },
    });

    await waitFor(() =>
      expect(mapSession.tokens["token-1"].noteBody).toBe(
        "2 goblins, one asleep",
      ),
    );
  });

  it("folds a note away from the detail panel and back again", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "2 goblins";
    mapSession.tokens["token-1"].width = 90;
    mapSession.tokens["token-1"].height = 90;

    render(TokenDetail);

    const button = await screen.findByTestId("token-note-collapse");
    expect(button.textContent).toContain("Collapse");

    await fireEvent.click(button);

    await waitFor(() =>
      expect(mapSession.tokens["token-1"].noteCollapsedFrom).toEqual({
        width: 90,
        height: 90,
      }),
    );
    expect(screen.getByTestId("token-note-collapse").textContent).toContain(
      "Expand",
    );
    // The body is still editable while folded away.
    expect(screen.getByTestId("token-note-body")).not.toBeNull();
  });

  it("gives guests no way to fold a note away", async () => {
    sessionModeStore.isGuestMode = true;
    mapStore.isGMMode = false;
    mapSession.tokens["token-1"].kind = "note";

    render(TokenDetail);

    await screen.findByTestId("token-note-body");
    expect(screen.queryByTestId("token-note-collapse")).toBeNull();
  });

  it("leaves the note editor read-only for guests", async () => {
    sessionModeStore.isGuestMode = true;
    mapStore.isGMMode = false;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "2 goblins";

    render(TokenDetail);

    const textarea = (await screen.findByTestId(
      "token-note-body",
    )) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it("generates an encounter into an empty note", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    oracleMock.isEnabled = true;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "";

    render(TokenDetail);

    const button = await screen.findByTestId("token-note-generate-encounter");
    await fireEvent.click(button);

    await waitFor(() =>
      expect(mapSession.tokens["token-1"].noteBody).toBe(
        "Three cultists mid-ritual",
      ),
    );
    expect(generateNoteEncounterMock).toHaveBeenCalledWith({
      themeId: "fantasy",
      context: "Crypt of the Sun",
    });
    // The offer is gone once there is something to overwrite.
    expect(screen.queryByTestId("token-note-generate-encounter")).toBeNull();
  });

  it("offers no generation on a note the GM has already written in", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    oracleMock.isEnabled = true;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "2 goblins";

    render(TokenDetail);

    await screen.findByTestId("token-note-body");
    expect(screen.queryByTestId("token-note-generate-encounter")).toBeNull();
  });

  it("offers no generation while AI is switched off", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    oracleMock.isEnabled = false;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "";

    render(TokenDetail);

    await screen.findByTestId("token-note-body");
    expect(screen.queryByTestId("token-note-generate-encounter")).toBeNull();
  });

  it("keeps a generated encounter out of a note the GM filled in meanwhile", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    oracleMock.isEnabled = true;
    mapSession.tokens["token-1"].kind = "note";
    mapSession.tokens["token-1"].noteBody = "";
    generateNoteEncounterMock.mockImplementationOnce(async () => {
      mapSession.updateToken("token-1", { noteBody: "typed by hand" });
      return { body: "Three cultists mid-ritual", aiFallback: false };
    });

    render(TokenDetail);
    await fireEvent.click(
      await screen.findByTestId("token-note-generate-encounter"),
    );

    await waitFor(() =>
      expect(mapSession.tokens["token-1"].noteBody).toBe("typed by hand"),
    );
  });

  it("hides add to initiative when the token is already in initiative", async () => {
    mapStore.isGMMode = true;
    sessionModeStore.isGuestMode = false;
    mapSession.initiativeManager.setSnapshotData(
      ["token-1"],
      mapSession.initiativeValues,
      mapSession.round,
      mapSession.turnIndex,
    );
    mapSession.initiativeManager.setSnapshotData(
      mapSession.initiativeOrder,
      { "token-1": 12 },
      mapSession.round,
      mapSession.turnIndex,
    );

    render(TokenDetail);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove Token" })).toBeTruthy(),
    );

    expect(
      screen.queryByRole("button", { name: "Add to Initiative" }),
    ).toBeNull();
  });
});
