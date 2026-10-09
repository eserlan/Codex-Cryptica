/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  party: [{ id: "kael", name: "Kael" }] as { id: string; name: string }[],
  session: { partyIds: ["kael"] } as { partyIds: string[] } | null,
  setParty: vi.fn(async (_ids: string[]) => {}),
  vault: {
    entities: {
      kael: { id: "kael", title: "Kael", type: "character" },
      ivo: { id: "ivo", title: "Brother Ivo", type: "character" },
      rock: { id: "rock", title: "The Tower", type: "location" },
    } as Record<string, any>,
    selectedEntityId: null as string | null,
  },
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: {
    get party() {
      return env.party;
    },
    get session() {
      return env.session;
    },
    setParty: env.setParty,
  },
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: env.vault }));

import SoloPartyMenu from "./SoloPartyMenu.svelte";

const ALL_ENTITIES = {
  kael: { id: "kael", title: "Kael", type: "character" },
  ivo: { id: "ivo", title: "Brother Ivo", type: "character" },
  rock: { id: "rock", title: "The Tower", type: "location" },
};

beforeEach(() => {
  env.party = [{ id: "kael", name: "Kael" }];
  env.session = { partyIds: ["kael"] };
  env.setParty.mockClear();
  env.vault.selectedEntityId = null;
  env.vault.entities = { ...ALL_ENTITIES };
});

it("shows every saved member, checked, even when the store's party view lags", async () => {
  // The saved ids are the source of truth; a stale party view must not hide a member.
  env.session = { partyIds: ["kael", "ivo"] };
  env.party = [{ id: "kael", name: "Kael" }];
  render(SoloPartyMenu);
  await openMenu();
  const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  expect(boxes.map((b) => b.checked)).toEqual([true, true]);
  expect(
    screen
      .getAllByTestId("solo-party-member")
      .map((b) => b.textContent?.trim()),
  ).toEqual(["Kael", "Brother Ivo"]);
});

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-party-menu"));
}

describe("SoloPartyMenu", () => {
  it("shows the party's names, and a name opens that character's entry", async () => {
    render(SoloPartyMenu);
    await openMenu();
    const member = screen.getByTestId("solo-party-member");
    expect(member.textContent).toContain("Kael");
    await fireEvent.click(member);
    expect(env.vault.selectedEntityId).toBe("kael");
  });

  it("lists only Character entities to add, and toggles membership", async () => {
    render(SoloPartyMenu);
    await openMenu();
    const choices = screen.getAllByRole("checkbox");
    expect(choices.map((c) => c.getAttribute("aria-label"))).toEqual([
      "Kael",
      "Brother Ivo",
    ]);

    await fireEvent.click(
      screen.getByRole("checkbox", { name: "Brother Ivo" }),
    );
    expect(env.setParty).toHaveBeenCalledWith(["kael", "ivo"]);
  });

  it("removes a member when its box is unticked", async () => {
    render(SoloPartyMenu);
    await openMenu();
    await fireEvent.click(screen.getByRole("checkbox", { name: "Kael" }));
    expect(env.setParty).toHaveBeenCalledWith([]);
  });

  it("explains that party members are Character entries when there are none", async () => {
    env.vault.entities = {
      rock: { id: "rock", title: "The Tower", type: "location" },
    };
    render(SoloPartyMenu);
    await openMenu();
    expect(
      screen.getByText(/party members are character entries/i),
    ).toBeTruthy();
  });

  it("gives every control an accessible name", async () => {
    render(SoloPartyMenu);
    await openMenu();
    for (const control of screen
      .getAllByRole("button")
      .concat(screen.getAllByRole("checkbox"))) {
      const name =
        control.getAttribute("aria-label") || control.textContent?.trim();
      expect(name).toBeTruthy();
    }
  });
});
