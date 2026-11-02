/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  openGeneratorWorkflow: vi.fn(),
  openActive: vi.fn(async () => false),
  setRootResolver: vi.fn(),
  setContextResolver: vi.fn(),
  list: vi.fn(async () => ({
    effectiveActiveId: null,
    entries: [],
  })),
  notify: vi.fn(),
  pendingRumour: null as null | {
    selected: { index: number; playerVisible: { lead: string; rumour: string } };
    scenario: { id: string; playerVisible: { lead: string; rumour: string } };
  },
}));

vi.mock("#lib/stores/oracle.svelte.js", () => ({
  oracle: {
    vault: {
      activeVaultId: "vault-1",
      entities: {},
      allEntities: [],
      getSpecificVaultHandle: vi.fn(),
    },
    adventure: {
      session: null,
      openActive: env.openActive,
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
  modalUIStore: { openGeneratorWorkflow: env.openGeneratorWorkflow },
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
  characterChoices: () => [],
}));
vi.mock("#lib/services/adventure/adventure-provisional-fact-creator.js", () => ({
  createAdventureEntityDraft: vi.fn(),
}));
vi.mock("#lib/stores/oracle/rumour-adventure-handoff.svelte.js", () => ({
  rumourAdventureHandoff: {
    forVault: () => env.pendingRumour,
    clear: vi.fn(),
  },
}));

import AdventureSurface from "./AdventureSurface.svelte";

beforeEach(() => {
  env.openGeneratorWorkflow.mockClear();
  env.openActive.mockClear();
  env.list.mockClear();
  env.pendingRumour = null;
});

describe("AdventureSurface entry", () => {
  it("starts on approach choices and opens the existing Rumour Generator", async () => {
    render(AdventureSurface);
    await screen.findByTestId("adventure-entry-choices");

    expect(screen.queryByLabelText("Premise")).toBeNull();
    await fireEvent.click(screen.getByTestId("adventure-discover"));

    expect(env.openGeneratorWorkflow).toHaveBeenCalledTimes(1);
    expect(env.openGeneratorWorkflow).toHaveBeenCalledWith("rumour");
    expect(env.openActive).toHaveBeenCalledWith("vault-1");
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
});
