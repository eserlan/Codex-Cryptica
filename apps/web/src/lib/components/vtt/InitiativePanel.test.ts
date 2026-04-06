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
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
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

    await fireEvent.dblClick(screen.getByRole("listitem"));

    expect(mapSessionMock.pingToken).toHaveBeenCalledWith("token-abc123");
  });
});
