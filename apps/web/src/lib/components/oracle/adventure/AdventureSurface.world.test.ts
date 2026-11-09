/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  openGeneratorWorkflow: vi.fn(),
  openIntentGeneratorWorkflow: vi.fn(),
}));

vi.mock("#lib/stores/oracle.svelte.js", async () => ({
  oracle: (await import("./__fixtures__/surface-env.svelte")).surfaceEnv,
}));
vi.mock("#lib/components/timeline/TemporalEditor.svelte", async () => ({
  default: (await import("./__fixtures__/TemporalEditorStub.svelte")).default,
}));
vi.mock("./AdventureFocusPlay.svelte", async () => ({
  default: (await import("./__fixtures__/FocusPlayStub.svelte")).default,
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "vault-1",
    status: "ready",
    isGuest: false,
  },
}));
vi.mock("#lib/stores/calendar.svelte.js", async () => {
  const { DEFAULT_CALENDAR } = await import("chronology-engine");
  const config = { ...DEFAULT_CALENDAR, revision: 1 };
  return {
    calendarStore: { config, getSnapshot: () => ({ config, revision: 1 }) },
  };
});
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openGeneratorWorkflow: env.openGeneratorWorkflow,
    openIntentGeneratorWorkflow: env.openIntentGeneratorWorkflow,
  },
}));
vi.mock("#lib/services/adventure/adventure-session-repository.js", () => ({
  adventureSessionRepository: {
    setRootResolver: vi.fn(),
    list: vi.fn(async () => ({ effectiveActiveId: null, entries: [] })),
  },
}));
vi.mock("#lib/services/adventure/adventure-context-service.js", () => ({
  adventureContextService: { setResolver: vi.fn() },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: vi.fn(), confirm: vi.fn() },
}));
vi.mock("#lib/services/solo-characters.js", () => ({
  characterChoices: () => [{ id: "pc-1", name: "Lira" }],
}));

import AdventureSurface from "./AdventureSurface.svelte";
import { surfaceEnv } from "./__fixtures__/surface-env.svelte";
import { rumourAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
import { adventurePromotionSettings } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";

const selected = {
  batchTitle: "Word Around Town",
  index: 2,
  origin: { kind: "rumour" as const, batchTitle: "Word Around Town", index: 2 },
  playerVisible: {
    rumour: "The miller vanished.",
    lead: "Old Mill",
    source: "Inn",
  },
  gmOnly: {
    reality: "exaggeration" as const,
    whatsActuallyHappening: "He is hiding grain.",
    ifInvestigated: "Footprints.",
  },
};
const scenario = {
  version: 1 as const,
  id: "scenario-1",
  origin: selected.origin,
  playerVisible: { rumour: "The miller vanished.", lead: "Old Mill" },
  gmOnly: { truth: "He is hiding grain." },
  status: "open" as const,
  stage: "hearsay" as const,
  events: [],
};

beforeEach(() => {
  env.openGeneratorWorkflow.mockClear();
  rumourAdventureHandoff.clear();
  surfaceEnv.vault.activeVaultId = "vault-1";
  surfaceEnv.vault.createEntity = vi.fn(async () => "entity-id");
  adventurePromotionSettings.setAutoPromote(false);
  surfaceEnv.vault.allEntities = [
    {
      id: "place-1",
      type: "location",
      title: "Northbrook",
      content: "",
      connections: [],
      labels: [],
    },
    {
      id: "pc-1",
      type: "character",
      title: "Lira",
      content: "",
      connections: [],
      labels: [],
    },
  ];
  surfaceEnv.adventure.session = null;
  surfaceEnv.adventure.errorCause = null;
  surfaceEnv.adventure.starting = false;
  surfaceEnv.adventure.start = vi.fn(async () => undefined);
});

async function reachPreview(withDate: boolean) {
  render(AdventureSurface);
  await fireEvent.click(await screen.findByTestId("adventure-enter-world"));
  await fireEvent.change(screen.getByTestId("world-entry-character"), {
    target: { value: "pc-1" },
  });
  await fireEvent.change(screen.getByTestId("world-entry-location"), {
    target: { value: "place-1" },
  });
  if (withDate) await fireEvent.click(screen.getByTestId("stub-pick-year"));
  await fireEvent.click(screen.getByTestId("world-entry-continue"));
  await screen.findByTestId("world-entry-preview");
}

describe("AdventureSurface world entry launch", () => {
  it("starts a year-only dated scene with a cloneable payload that keeps the date", async () => {
    await reachPreview(true);
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    await waitFor(() => expect(surfaceEnv.adventure.start).toHaveBeenCalled());
    const input = (surfaceEnv.adventure.start as any).mock.calls[0][0];
    expect(() => structuredClone(input)).not.toThrow();
    expect(input.worldEntry.at).toEqual({
      year: 618,
      precision: "year",
      calendarRevision: 1,
    });
    expect(input.sourceRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordId: "pc-1", role: "player-character" }),
      ]),
    );
  });

  it("starts without a date", async () => {
    await reachPreview(false);
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    await waitFor(() => expect(surfaceEnv.adventure.start).toHaveBeenCalled());
    const input = (surfaceEnv.adventure.start as any).mock.calls[0][0];
    expect(input.worldEntry.at).toBeUndefined();
  });

  it("keeps the preview and shows safe copy when the start is rejected", async () => {
    surfaceEnv.adventure.start = vi.fn(async () => {
      throw new Error("PRIVATE_VAULT_SENTINEL");
    });
    await reachPreview(true);
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain("PRIVATE_VAULT_SENTINEL");
    expect(screen.getByTestId("world-entry-preview")).toBeTruthy();
  });

  it("maps a resolved opening failure to fixed copy", async () => {
    surfaceEnv.adventure.start = vi.fn(async () => {
      surfaceEnv.adventure.errorMessage = "raw oracle text SENTINEL";
      surfaceEnv.adventure.errorCause = "save-failed";
    });
    await reachPreview(false);
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not be saved/i);
    expect(alert.textContent).not.toContain("SENTINEL");
  });

  it("ignores a start that completes after the Vault changed", async () => {
    let finish!: () => void;
    surfaceEnv.adventure.start = vi.fn(
      () =>
        new Promise<undefined>((resolve) => {
          finish = () => {
            surfaceEnv.adventure.errorCause = "opening-failed";
            resolve(undefined);
          };
        }),
    );
    await reachPreview(true);
    await fireEvent.click(screen.getByTestId("world-entry-start"));
    await waitFor(() => expect(surfaceEnv.adventure.start).toHaveBeenCalled());
    surfaceEnv.vault.activeVaultId = "vault-2";
    // The new Vault reaches its own preview before the old start settles.
    await fireEvent.click(await screen.findByTestId("adventure-enter-world"));
    await fireEvent.change(screen.getByTestId("world-entry-location"), {
      target: { value: "place-1" },
    });
    await fireEvent.change(screen.getByTestId("world-entry-character"), {
      target: { value: "pc-1" },
    });
    await fireEvent.click(screen.getByTestId("world-entry-continue"));
    await screen.findByTestId("world-entry-preview");
    finish();
    await tick();
    await tick();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("world-entry-preview")).toBeTruthy();
  });

  it("does not start while AI Disabled is on", async () => {
    const { discoveryPolicyStore } =
      await import("#lib/stores/ui/discovery-policy.svelte.js");
    discoveryPolicyStore.aiDisabled = true;
    try {
      await reachPreview(false);
      await fireEvent.click(screen.getByTestId("world-entry-start"));
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /AI Disabled/,
      );
      expect(surfaceEnv.adventure.start).not.toHaveBeenCalled();
    } finally {
      discoveryPolicyStore.aiDisabled = false;
    }
  });

  it("disables changing the starting approach while a start is in flight", async () => {
    render(AdventureSurface);
    await fireEvent.click(await screen.findByTestId("adventure-own-premise"));
    surfaceEnv.adventure.starting = true;
    await tick();
    expect(
      (screen.getByTestId("adventure-change-start") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("AdventureSurface leaving an adventure", () => {
  it("does not reopen the adventure after the player leaves it", async () => {
    // openActive reads the live session synchronously, as the real one does.
    const openActive = vi.fn(async () => {
      void surfaceEnv.adventure.session;
      return false;
    });
    surfaceEnv.adventure.openActive = openActive;
    surfaceEnv.adventure.session = { id: "adventure-1" };
    render(AdventureSurface);
    await screen.findByTestId("adventure-play-surface");
    expect(openActive).toHaveBeenCalledTimes(1);

    surfaceEnv.adventure.session = null;
    await screen.findByTestId("adventure-enter-world");

    expect(openActive).toHaveBeenCalledTimes(1);
  });
});

describe("AdventureSurface discovery promotion", () => {
  it("stops batch promotion when the Vault changes during a save", async () => {
    let finishFirstSave!: () => void;
    surfaceEnv.vault.createEntity = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishFirstSave = () => resolve("first-entity");
        }),
    );
    surfaceEnv.adventure.session = {
      id: "adv-batch",
      title: "The Haunted Moor",
    };
    render(AdventureSurface);

    await fireEvent.click(
      await screen.findByTestId("test-add-all-discoveries"),
    );
    await waitFor(() => {
      expect(surfaceEnv.vault.createEntity).toHaveBeenCalledTimes(1);
    });
    surfaceEnv.vault.activeVaultId = "vault-2";
    finishFirstSave();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(surfaceEnv.vault.createEntity).toHaveBeenCalledTimes(1);
  });

  it("stops auto-promotion when the Vault changes during a save", async () => {
    let finishFirstSave!: () => void;
    surfaceEnv.vault.createEntity = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finishFirstSave = () => resolve("first-entity");
        }),
    );
    adventurePromotionSettings.setAutoPromote(true);
    surfaceEnv.vault.allEntities = [];
    surfaceEnv.adventure.session = {
      id: "adv-auto-switch",
      title: "The Haunted Moor",
      provisionalFacts: [
        {
          id: "fact-one",
          kind: "person",
          name: "First Discovery",
          summary: "A person found in the adventure.",
          introducedOnTurnId: "turn-one",
          visibility: "player-visible",
        },
        {
          id: "fact-two",
          kind: "place",
          name: "Second Discovery",
          summary: "A place found in the adventure.",
          introducedOnTurnId: "turn-one",
          visibility: "player-visible",
        },
      ],
    };
    render(AdventureSurface);

    await waitFor(() => {
      expect(surfaceEnv.vault.createEntity).toHaveBeenCalledTimes(1);
    });
    surfaceEnv.vault.activeVaultId = "vault-2";
    finishFirstSave();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(surfaceEnv.vault.createEntity).toHaveBeenCalledTimes(1);
    adventurePromotionSettings.setAutoPromote(false);
  });
});

describe("AdventureSurface rumour handoff", () => {
  it("does not offer to archive the adventure that is being created from the rumour", async () => {
    rumourAdventureHandoff.prepare("vault-1", selected, scenario);
    surfaceEnv.adventure.session = {
      id: "adventure-new",
      scenarioCollection: { items: [{ id: "scenario-1" }] },
    };
    render(AdventureSurface);
    await screen.findByTestId("adventure-play-surface");
    expect(screen.queryByTestId("existing-adventure-rumour-choice")).toBeNull();
  });

  it("still offers the archive choice for a different active adventure", async () => {
    rumourAdventureHandoff.prepare("vault-1", selected, scenario);
    surfaceEnv.adventure.session = {
      id: "older",
      scenarioCollection: undefined,
    };
    render(AdventureSurface);
    expect(
      await screen.findByTestId("existing-adventure-rumour-choice"),
    ).toBeTruthy();
  });

  it("keeps a rumour after a failed add and shows fixed recovery copy", async () => {
    rumourAdventureHandoff.prepare("vault-1", selected, scenario);
    surfaceEnv.adventure.session = {
      id: "older",
      scenarioCollection: undefined,
      pendingRoll: null,
    };
    surfaceEnv.adventure.addScenario.mockRejectedValueOnce(
      new Error("state-budget-exceeded"),
    );
    render(AdventureSurface);

    await fireEvent.click(
      await screen.findByRole("button", { name: "Add to current adventure" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("The adventure is unchanged.");
    expect(alert.textContent).not.toContain("state-budget-exceeded");
    expect(rumourAdventureHandoff.forVault("vault-1")).not.toBeNull();
  });

  it("returns to the unchanged rumour batch when the start is cancelled", async () => {
    const draft = { title: "Word Around Town", content: "six", lore: "notes" };
    rumourAdventureHandoff.prepare("vault-1", selected, scenario, draft as any);
    render(AdventureSurface);
    await fireEvent.click(await screen.findByTestId("cancel-rumour-start"));
    expect(env.openGeneratorWorkflow).toHaveBeenCalledWith("rumour");
    expect(rumourAdventureHandoff.forVault("vault-1")).toBeNull();
    expect(rumourAdventureHandoff.takeSourceDraft("vault-2")).toBeNull();
    expect(rumourAdventureHandoff.takeSourceDraft("vault-1")).toEqual(draft);
    expect(rumourAdventureHandoff.takeSourceDraft("vault-1")).toBeNull();
  });

  it("automatically promotes discoveries to Codex when autoPromote is enabled", async () => {
    adventurePromotionSettings.setAutoPromote(true);
    surfaceEnv.vault.allEntities = [];
    surfaceEnv.adventure.session = {
      id: "adv-auto",
      title: "The Haunted Moor",
      provisionalFacts: [
        {
          id: "fact-ghost",
          kind: "person",
          name: "The Wailing Spirit",
          summary: "A restless phantom on the moors.",
          visibility: "player-visible",
        },
      ],
    };

    render(AdventureSurface);
    await waitFor(() => {
      expect(surfaceEnv.vault.createEntity).toHaveBeenCalledWith(
        "character",
        "The Wailing Spirit",
        expect.objectContaining({
          content: expect.stringContaining("The Haunted Moor"),
        }),
      );
    });
    adventurePromotionSettings.setAutoPromote(false);
  });
});
