/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const mapSessionMock = vi.hoisted(() => ({
  initiativeEntries: [
    {
      tokenId: "token-abc123",
      initiativeValue: 18,
      hasActed: false,
    },
  ],
  activeTokenId: "token-abc123",
  round: 3,
  tokens: {
    "token-abc123": {
      id: "token-abc123",
      name: "Mara",
    },
  },
  advanceTurn: vi.fn(),
  setInitiativeValue: vi.fn(),
  reorderInitiative: vi.fn(),
  pingToken: vi.fn(),
  refreshPopoutSnapshot: vi.fn(),
  setSelection: vi.fn(),
  removeToken: vi.fn(),
  canAdvanceTurn: vi.fn(() => true),
  myPeerId: "host-peer",
}));

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
}));

const uiStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: mapStoreMock,
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: uiStoreMock,
}));

import InitiativePanel from "./InitiativePanel.svelte";

describe("InitiativePanel", () => {
  beforeEach(() => {
    mapSessionMock.initiativeEntries = [
      {
        tokenId: "token-abc123",
        initiativeValue: 18,
        hasActed: false,
      },
    ];
    mapSessionMock.activeTokenId = "token-abc123";
    mapSessionMock.round = 3;
    mapSessionMock.tokens = {
      "token-abc123": {
        id: "token-abc123",
        name: "Mara",
      },
    };
    mapSessionMock.advanceTurn.mockReset();
    mapSessionMock.setInitiativeValue.mockReset();
    mapSessionMock.reorderInitiative.mockReset();
    mapSessionMock.pingToken.mockReset();
    mapSessionMock.refreshPopoutSnapshot.mockReset();
    mapSessionMock.setSelection.mockReset();
    mapSessionMock.removeToken.mockReset();
    mapSessionMock.canAdvanceTurn.mockReset();
    mapSessionMock.canAdvanceTurn.mockReturnValue(true);
    mapSessionMock.myPeerId = "host-peer";
    mapStoreMock.isGMMode = true;
    uiStoreMock.isGuestMode = false;
  });

  it("hides the internal combatant id", () => {
    render(InitiativePanel);

    expect(screen.getByText("Mara")).toBeTruthy();
    expect(screen.getByText("Round 3")).toBeTruthy();
    expect(screen.getByText("Init")).toBeTruthy();
    expect(screen.queryByText("token-abc123")).toBeNull();
  });

  it("pings a combatant on double click", async () => {
    render(InitiativePanel);

    await fireEvent.dblClick(screen.getByTestId("initiative-row"));

    expect(mapSessionMock.pingToken).toHaveBeenCalledWith("token-abc123");
  });

  it("selects a combatant from the initiative list", async () => {
    render(InitiativePanel);

    await fireEvent.click(screen.getByRole("button", { name: "Mara" }));

    expect(mapSessionMock.setSelection).toHaveBeenCalledWith("token-abc123");
  });

  it("deletes a combatant on right click for GMs", async () => {
    render(InitiativePanel);

    await fireEvent.contextMenu(screen.getByRole("button", { name: "Mara" }));

    expect(mapSessionMock.removeToken).toHaveBeenCalledWith("token-abc123");
  });

  it("steps initiative with arrow keys", async () => {
    render(InitiativePanel);

    const input = screen.getByLabelText("Init");
    input.focus();

    await fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(mapSessionMock.setInitiativeValue).toHaveBeenCalledWith(
      "token-abc123",
      19,
    );

    await fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(mapSessionMock.setInitiativeValue).toHaveBeenCalledWith(
      "token-abc123",
      18,
    );
    expect(document.activeElement).toBe(input);
  });

  it("opens the initiative list in a standalone window", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(InitiativePanel);

    await fireEvent.click(screen.getByLabelText("Pop out initiative list"));

    expect(openSpy).toHaveBeenCalledWith(
      "/map/initiative",
      "codex-initiative",
      "width=392,height=612,menubar=no,toolbar=no,location=no,status=no",
    );

    openSpy.mockRestore();
  });

  it("disables next turn for guests who do not own the active token", () => {
    mapStoreMock.isGMMode = false;
    uiStoreMock.isGuestMode = true;
    mapSessionMock.myPeerId = "guest-2";
    mapSessionMock.canAdvanceTurn.mockReturnValue(false);

    render(InitiativePanel);

    expect(screen.getByRole("button", { name: "Next Turn" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});
