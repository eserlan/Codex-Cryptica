/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  openIntentGeneratorWorkflow: vi.fn(),
  vaultReady: true,
  openActive: vi.fn(async () => false),
  setWorldEntryRumourGenerator: vi.fn((callback: unknown) => {
    env.worldEntryRumourGenerator = callback;
  }),
  worldEntryRumourGenerator: null as unknown,
  setRootResolver: vi.fn(),
  setContextResolver: vi.fn(),
  list: vi.fn(async () => ({
    effectiveActiveId: null,
    entries: [],
  })),
  notify: vi.fn(),
  characters: [] as Array<{ id: string; name: string }>,
  pendingRumour: null as any,
  cancelRumourReturn: true,
}));

vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: {
    vault: {
      get isInitialized() {
        return env.vaultReady;
      },
      activeVaultId: "vault-1",
      entities: {},
      allEntities: [],
      getSpecificVaultHandle: vi.fn(),
    },
    adventure: {
      session: null,
      openActive: env.openActive,
      setWorldEntryRumourGenerator: env.setWorldEntryRumourGenerator,
      readOnly: false,
    },
  },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isInitialized: true,
    activeVaultId: "vault-1",
    status: "ready",
    isGuest: false,
  },
}));
vi.mock("#lib/stores/calendar.svelte.js", () => ({
  calendarStore: { getSnapshot: () => ({ config: {} }) },
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openIntentGeneratorWorkflow: env.openIntentGeneratorWorkflow,
    openGeneratorWorkflow: env.openIntentGeneratorWorkflow,
  },
}));
vi.mock("#lib/services/adventure/adventure-session-repository.js", () => ({
  adventureSessionRepository: {
    setRootResolver: env.setRootResolver,
    list: env.list,
  },
}));
vi.mock("#lib/services/adventure/adventure-context-service.js", () => ({
  adventureContextService: { setResolver: env.setContextResolver },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: env.notify, confirm: vi.fn() },
}));
vi.mock("#lib/services/solo-characters.js", () => ({
  characterChoices: () => env.characters,
}));
vi.mock(
  "#lib/services/adventure/adventure-provisional-fact-creator.js",
  () => ({
    createAdventureEntityDraft: vi.fn(),
  }),
);
vi.mock("#lib/stores/oracle/rumour-adventure-handoff.svelte.js", () => ({
  rumourAdventureHandoff: {
    forVault: () => env.pendingRumour,
    clear: vi.fn(),
    cancel: vi.fn(() => env.cancelRumourReturn),
  },
}));

import AdventureSurface from "./AdventureSurface.svelte";

beforeEach(() => {
  env.openIntentGeneratorWorkflow.mockClear();
  env.openActive.mockClear();
  env.vaultReady = true;
  env.setWorldEntryRumourGenerator.mockClear();
  env.worldEntryRumourGenerator = null;
  env.list.mockClear();
  env.pendingRumour = null;
  env.characters = [];
});

describe("AdventureSurface entry", () => {
  it("registers the background rumour generator with the adventure manager", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(env.setWorldEntryRumourGenerator).toHaveBeenCalledTimes(1);
    expect(env.setWorldEntryRumourGenerator).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(env.worldEntryRumourGenerator).toEqual(expect.any(Function));
  });

  it("starts on approach choices and opens the existing Rumour Generator", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(screen.queryByLabelText("Premise")).toBeNull();
    await fireEvent.click(screen.getByTestId("adventure-discover"));

    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledTimes(1);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("rumour");
    expect(env.openActive).toHaveBeenCalledWith("vault-1");
  });

  it("does not look for an active adventure until the Vault has loaded", () => {
    env.vaultReady = false;
    render(AdventureSurface);
    expect(env.openActive).not.toHaveBeenCalled();
    expect(screen.getByText("Checking for an active adventure…")).toBeTruthy();
    expect(screen.queryByTestId("adventure-entry-choices")).toBeNull();
  });

  it("opens the manual form and preserves its draft when choosing another approach", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    const premise = screen.getByLabelText("Premise") as HTMLTextAreaElement;
    await fireEvent.input(premise, {
      target: { value: "A wagon vanished outside the city." },
    });
    await fireEvent.click(screen.getByTestId("adventure-change-start"));
    expect(screen.getByTestId("adventure-entry-choices")).toBeTruthy();
    expect(screen.queryByLabelText("Premise")).toBeNull();

    await fireEvent.click(screen.getByTestId("adventure-own-premise"));
    await waitFor(() => {
      expect(
        (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
      ).toBe("A wagon vanished outside the city.");
    });
  });

  it("keeps a canonical Vault character selected after returning to the choices", async () => {
    env.characters = [{ id: "kael", name: "Kael" }];
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    const selected = screen.getByTestId(
      "adventure-character-picker",
    ) as HTMLSelectElement;
    await fireEvent.change(selected, { target: { value: "kael" } });
    expect(selected.value).toBe("kael");

    await fireEvent.click(screen.getByTestId("adventure-change-start"));
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));

    expect(
      (screen.getByTestId("adventure-character-picker") as HTMLSelectElement)
        .value,
    ).toBe("kael");
  });

  it("opens the ready-made adventure generator when clicking Surprise Me with an Adventure", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    await fireEvent.click(screen.getByTestId("adventure-surprise-me"));

    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledTimes(1);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("adventure");
  });

  it("prefills title and premise when a ready-made adventure handoff is present", async () => {
    env.pendingRumour = {
      selected: {
        playerVisible: {
          title: "The Whispering Spire",
          openingSituation: "A spire hums with blue lightning at twilight.",
          primaryObjective: "Deactivate the core before the storm breaks.",
          startingLocations: ["The Base"],
        },
      },
      scenario: {
        id: "adv-scenario-1",
        playerVisible: {
          rumour: "A spire hums with blue lightning at twilight.",
          lead: "Deactivate the core before the storm breaks.",
        },
        origin: { kind: "manual", manualId: "adv-scenario-1" },
      },
      adventureTitle: "The Whispering Spire",
      sourceGeneratorId: "adventure",
    };

    render(AdventureSurface);

    expect(await screen.findByTestId("selected-rumour-preview")).toBeTruthy();
    expect(screen.getByText("Prepared adventure seed")).toBeTruthy();
    expect(
      (screen.getByLabelText("Adventure title") as HTMLInputElement).value,
    ).toBe("The Whispering Spire");
    expect(
      (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
    ).toBe("A spire hums with blue lightning at twilight.");
  });

  it("reopens the adventure generator when cancelling a prepared adventure start", async () => {
    env.pendingRumour = {
      selected: {
        playerVisible: {
          title: "The Whispering Spire",
          openingSituation: "A spire hums with blue lightning at twilight.",
          primaryObjective: "Deactivate the core.",
          startingLocations: [],
        },
      },
      scenario: {
        id: "adv-scenario-1",
        playerVisible: {
          rumour: "A spire hums.",
          lead: "Deactivate core.",
        },
        origin: { kind: "manual", manualId: "adv-scenario-1" },
      },
      adventureTitle: "The Whispering Spire",
      sourceGeneratorId: "adventure",
    };

    render(AdventureSurface);
    const cancelBtn = await screen.findByTestId("cancel-rumour-start");
    expect(cancelBtn.textContent?.trim()).toBe("Cancel prepared adventure");

    await fireEvent.click(cancelBtn);
    expect(env.openIntentGeneratorWorkflow).toHaveBeenCalledWith("adventure");
  });
});
