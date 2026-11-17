import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import { AdventureStartDraft } from "./adventure-start-draft.svelte.js";
import { AdventureWorldEntry } from "./adventure-world-entry.svelte.js";
import { AdventureRumourActions } from "./adventure-rumour-actions.svelte.js";
import { AdventureImportController } from "./adventure-import.svelte.js";
import { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";
import AdventureEntryFlow from "./AdventureEntryFlow.svelte";

function setup() {
  const draft = new AdventureStartDraft();
  const manager = new AdventureManager();
  const worldEntry = new AdventureWorldEntry({
    manager,
    getVaultId: () => "vault-1",
    getEntities: () => [],
    getCharacters: () => [],
    getLocations: () => [],
    getCalendar: () => DEFAULT_CALENDAR,
    getPrecheck: () => ({ aiDisabled: false, online: true }),
    onReview: () => {
      draft.approach = "preview";
    },
    onStarted: vi.fn(),
  });
  const rumours = new AdventureRumourActions({
    manager,
    draft,
    getVaultId: () => "vault-1",
    openGenerator: vi.fn(),
    handoff: { forVault: () => null, clear: vi.fn(), cancel: () => false },
  });
  const imports = new AdventureImportController({
    getVaultId: () => "vault-1",
    canImport: () => true,
    isGuest: () => false,
    saveApproved: async (_id, pkg) => ({ package: pkg }),
    notify: vi.fn(),
    onReview: vi.fn(),
    onCancel: vi.fn(),
    onApproved: vi.fn(),
  });
  const library = new AdventurePackageLibrary({
    getVaultId: () => "vault-1",
    isReady: () => true,
    isGuest: () => false,
    listPackages: async () => [],
    listSessions: async () => ({ effectiveActiveId: null, entries: [] }),
    open: async () => {},
    resumeArchived: async () => {},
  });
  return {
    manager,
    draft,
    worldEntry,
    rumours,
    imports,
    library,
    vaultId: "vault-1",
    selectedRumour: null,
    characters: [],
    locations: [],
    calendar: DEFAULT_CALENDAR,
    canDiscover: true,
    canImport: true,
    onDiscover: vi.fn(),
    onSurpriseMe: vi.fn(),
    onScenarioStarted: vi.fn(),
  };
}

describe("adventure entry flow", () => {
  it("routes discovery and surprise actions through the supplied callbacks", async () => {
    const props = setup();
    render(AdventureEntryFlow, props);
    await fireEvent.click(screen.getByTestId("adventure-discover"));
    await fireEvent.click(screen.getByTestId("adventure-surprise-me"));
    expect(props.onDiscover).toHaveBeenCalledOnce();
    expect(props.onSurpriseMe).toHaveBeenCalledOnce();
  });

  it("retains the bound premise when the player changes approach and returns", async () => {
    const props = setup();
    render(AdventureEntryFlow, props);
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));
    await fireEvent.input(screen.getByLabelText("Premise"), {
      target: { value: "The miller vanished." },
    });
    await fireEvent.click(screen.getByTestId("adventure-change-start"));
    expect(screen.queryByLabelText("Premise")).toBeNull();
    await fireEvent.click(screen.getByTestId("adventure-own-premise"));
    expect(
      (screen.getByLabelText("Premise") as HTMLTextAreaElement).value,
    ).toBe("The miller vanished.");
    expect(props.draft.premise).toBe("The miller vanished.");
  });

  it("prevents changing approach while a start is in progress", () => {
    const props = setup();
    props.draft.approach = "premise";
    props.manager.starting = true;
    render(AdventureEntryFlow, props);
    expect(
      (screen.getByTestId("adventure-change-start") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows import failures and disables unavailable owner-only actions", () => {
    const props = setup();
    props.canDiscover = false;
    props.canImport = false;
    props.imports.error = "Unable to read the selected adventure.";
    render(AdventureEntryFlow, props);
    expect(screen.getByTestId("adventure-import-error").textContent).toContain(
      props.imports.error,
    );
    expect(
      (screen.getByTestId("adventure-import") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId("adventure-discover") as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
