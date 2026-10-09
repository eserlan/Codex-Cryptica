/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  aiDisabled: false,
  layout: {
    activeSidebarTool: "none" as string,
    leftSidebarOpen: false,
  },
  oracle: { ui: { setPendingPrompt: vi.fn() } },
  session: { sceneName: "The flooded crypt", mapId: "m1" as string | null },
  party: [{ id: "kael", name: "Kael" }] as { id: string; name: string }[],
  maps: { m1: { id: "m1", name: "Greyhollow" } } as Record<string, any>,
  journal: {
    current: {
      status: "active",
      entries: [
        {
          id: "e1",
          timestamp: 1,
          type: "table-result",
          content: "Tavern patrons → a one-eyed smuggler",
        },
      ],
    } as any,
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  get discoveryPolicyStore() {
    return { aiDisabled: env.aiDisabled };
  },
}));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: env.layout,
}));
vi.mock("$lib/stores/oracle.svelte", () => ({ oracle: env.oracle }));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: { maps: env.maps } }));
vi.mock("$lib/stores/session-journal.svelte", () => ({
  sessionJournalStore: env.journal,
}));
vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: {
    get session() {
      return env.session;
    },
    get party() {
      return env.party;
    },
  },
}));

import SoloOracleMenu from "./SoloOracleMenu.svelte";

beforeEach(() => {
  env.aiDisabled = false;
  env.layout.activeSidebarTool = "none";
  env.layout.leftSidebarOpen = false;
  env.oracle.ui.setPendingPrompt.mockClear();
});

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-oracle-menu"));
}

describe("SoloOracleMenu", () => {
  it("offers Open Oracle and the four shortcuts while AI is on", async () => {
    render(SoloOracleMenu);
    await openMenu();
    expect(screen.getByTestId("solo-oracle-open")).toBeTruthy();
    expect(screen.getAllByTestId("solo-oracle-shortcut")).toHaveLength(4);
  });

  it("offers Let the Oracle run a scene as a link to Adventure Mode, and nothing is prefilled", async () => {
    render(SoloOracleMenu);
    await openMenu();
    const entry = screen.getByTestId(
      "solo-adventure-entry",
    ) as HTMLAnchorElement;
    expect(entry.getAttribute("href")).toMatch(/\/adventure$/);
    expect(entry.textContent).toContain("Let the Oracle run a scene");
    expect(env.oracle.ui.setPendingPrompt).not.toHaveBeenCalled();
  });

  it("Open Oracle opens the Oracle sidebar without prefilling anything", async () => {
    render(SoloOracleMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-oracle-open"));
    expect(env.layout.activeSidebarTool).toBe("oracle");
    expect(env.layout.leftSidebarOpen).toBe(true);
    expect(env.oracle.ui.setPendingPrompt).not.toHaveBeenCalled();
  });

  it("a shortcut prefills the question with session context and opens the Oracle, sending nothing", async () => {
    render(SoloOracleMenu);
    await openMenu();
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /How does this NPC react/i }),
    );
    expect(env.layout.activeSidebarTool).toBe("oracle");
    expect(env.layout.leftSidebarOpen).toBe(true);
    expect(env.oracle.ui.setPendingPrompt).toHaveBeenCalledTimes(1);
    const prompt = env.oracle.ui.setPendingPrompt.mock.calls[0][0] as string;
    expect(prompt.startsWith("How does this NPC react?")).toBe(true);
    expect(prompt).toContain('scene "The flooded crypt"');
    expect(prompt).toContain('place "Greyhollow"');
    expect(prompt).toContain("party Kael");
    expect(prompt).toContain("Tavern patrons → a one-eyed smuggler");
  });

  it("is absent while AI is turned off", () => {
    env.aiDisabled = true;
    render(SoloOracleMenu);
    expect(screen.queryByTestId("solo-oracle-menu")).toBeNull();
    expect(screen.queryByTestId("solo-adventure-entry")).toBeNull();
  });
});
