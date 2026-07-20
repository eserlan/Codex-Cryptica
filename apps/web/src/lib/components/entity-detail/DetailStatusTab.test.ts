/** @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DetailStatusTab from "./DetailStatusTab.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock Svelte client runtime

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    defaultVisibility: "public",
    allEntities: [
      { id: "target-1", title: "Target 1" },
      { id: "source-1", title: "Source 1" },
      { id: "parent-entity", title: "Parent Entity" },
      { id: "child-entity", title: "Child Entity", parent: "entity-1" },
    ],
    entities: {
      "target-1": { id: "target-1", title: "Target 1" },
      "source-1": { id: "source-1", title: "Source 1" },
      "parent-entity": { id: "parent-entity", title: "Parent Entity" },
      "child-entity": {
        id: "child-entity",
        title: "Child Entity",
        parent: "entity-1",
      },
    },
    inboundConnections: {
      "entity-1": [
        {
          sourceId: "source-1",
          connection: { target: "entity-1", type: "enemy", label: "Enemy of" },
        },
      ],
    },
    removeConnection: vi.fn(),
    addConnection: vi.fn().mockResolvedValue(true),
    updateEntity: vi.fn().mockResolvedValue(true),
    loadTranscriptsForCharacter: vi.fn().mockResolvedValue([]),
    saveTranscript: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
    jargon: {
      connections_header: "Connections",
    },
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openGeneratorWorkflowForEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    effectiveApiKey: "test-key",
    modelName: "test-model",
    textGeneration: {
      generateResponse: vi.fn(
        async (_apiKey, _prompt, _history, _context, _model, onPartial) => {
          onPartial("- Speaks softly and avoids direct promises.");
        },
      ),
    },
  },
}));

vi.mock("./generate-personality", () => ({
  generatePersonality: vi.fn(),
}));

vi.mock("$lib/cloud-bridge/oracle-bridge", () => ({
  oracleBridge: {
    isReady: false,
  },
}));

vi.mock("comlink", () => ({
  proxy: vi.fn((fn) => fn),
}));

// Mock sub-components to simplify testing
vi.mock("$lib/components/MarkdownEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/timeline/TemporalEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/connections/ConnectionEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("./proposals/DetailProposals.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("./MockAutocomplete.svelte");
  return {
    default: mod.default,
  };
});

describe("DetailStatusTab", () => {
  const mockEntity = {
    id: "entity-1",
    title: "Entity 1",
    connections: [{ target: "target-1", type: "friendly", label: "Friend of" }],
    content: "",
    lore: "",
    type: "npc",
    tags: [],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).isGuest = false;
  });

  it("renders outbound and inbound connections with delete buttons", () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "## Summary\nHe is a blacksmith.",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.getByText("Target 1")).toBeTruthy();
    expect(screen.getByText("Source 1")).toBeTruthy();

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    expect(deleteButtons).toHaveLength(3);
  });

  it("calls vault.removeConnection when deleting an outbound connection", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    // Outbound is typically first in the list as per code: [...outbound, ...inbound]
    await fireEvent.click(deleteButtons[0]);

    expect(vault.removeConnection).toHaveBeenCalledWith(
      "entity-1",
      "target-1",
      "friendly",
    );
  });

  it("calls vault.removeConnection when deleting an inbound connection", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    // Inbound is second
    await fireEvent.click(deleteButtons[1]);

    expect(vault.removeConnection).toHaveBeenCalledWith(
      "source-1",
      "entity-1",
      "enemy",
    );
  });

  it("hides delete buttons when in guest mode", () => {
    (vault as any).isGuest = true;

    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.queryByLabelText("Delete connection")).toBeNull();
  });

  it("renders child connection successfully but not parent in connection list", () => {
    const testEntity = {
      ...mockEntity,
      parent: "parent-entity",
    };

    render(DetailStatusTab, {
      entity: testEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.queryByText("Parent Entity")).toBeNull();
    expect(screen.getByText("Child Entity")).toBeTruthy();
    expect(screen.queryByText("Parent")).toBeNull();
    expect(screen.getByText("Child")).toBeTruthy();
  });

  it("toggles inline connection form and can cancel or connect", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    // Toggle form on
    const addBtn = screen.getByLabelText("Add new connection");
    await fireEvent.click(addBtn);

    // Verify form fields
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();

    // Fill in target using our MockAutocomplete
    const autocompleteInput = screen.getByTestId("mock-autocomplete");
    await fireEvent.input(autocompleteInput, { target: { value: "Target 1" } });

    // Fill custom label
    const customLabelInput = screen.getByPlaceholderText(
      "e.g. Ally, Rivalling, Secret",
    );
    await fireEvent.input(customLabelInput, {
      target: { value: "Special Friend" },
    });

    // Submit
    const connectBtn = screen.getByRole("button", { name: /^connect$/i });
    await fireEvent.click(connectBtn);

    expect(vault.addConnection).toHaveBeenCalledWith(
      "entity-1",
      "target-1",
      "related_to",
      "Special Friend",
    );
  });

  it("does not render duplicate child connections if already connected directly", () => {
    const testEntity = {
      ...mockEntity,
      connections: [
        { target: "child-entity", type: "friendly", label: "Friend of" },
      ],
    };

    render(DetailStatusTab, {
      entity: testEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.getByText("Child Entity")).toBeTruthy();
    expect(screen.queryByText("Child")).toBeNull();
  });

  it("clicks establish custom connection button on child row to pre-populate form and connect", async () => {
    const testEntity = {
      ...mockEntity,
    };

    render(DetailStatusTab, {
      entity: testEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const establishButtons = screen.getAllByLabelText(
      "Establish custom connection",
    );
    expect(establishButtons.length).toBeGreaterThan(0);

    await fireEvent.click(establishButtons[0]);

    // Verify the connection form is open and has target pre-filled
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeTruthy();
    const autocompleteInput = screen.getByTestId(
      "mock-autocomplete",
    ) as HTMLInputElement;
    expect(autocompleteInput.value).toBe("Child Entity");

    // Submit and assert that vault.addConnection was called with pre-populated child entity ID
    const connectBtn = screen.getByRole("button", { name: /^connect$/i });
    await fireEvent.click(connectBtn);

    expect(vault.addConnection).toHaveBeenCalledWith(
      "entity-1",
      "child-entity",
      "related_to",
      undefined,
    );
  });

  it("renders 'Generate Related' button and triggers modal open when clicked", async () => {
    const { modalUIStore } = await import("$lib/stores/ui/modal-ui.svelte");
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const generateBtn = screen.getByText("Generate Related");
    expect(generateBtn).toBeDefined();

    await fireEvent.click(generateBtn);
    expect(modalUIStore.openGeneratorWorkflowForEntity).toHaveBeenCalledWith(
      "entity-1",
    );
  });

  it("hides the 'Generate Related' button for guest sessions", async () => {
    const { modalUIStore } = await import("$lib/stores/ui/modal-ui.svelte");
    (vault as any).isGuest = true;

    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.queryByText("Generate Related")).toBeNull();
    expect(modalUIStore.openGeneratorWorkflowForEntity).not.toHaveBeenCalled();
  });

  const mockCharacterEntity = {
    id: "char-1",
    title: "Character 1",
    type: "character",
    content: "He is a blacksmith.",
    lore: "Secretly related to the king.",
    connections: [],
    tags: [],
    guestChatConfig: {
      isEnabled: true,
      contextScope: "hybrid",
      extraInstructions: "Speaks with a lisp.",
      isHostReviewable: true,
      keepMemory: true,
    },
  } as any;

  it("does not render Guest Character Chat for non-character entities", () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: undefined,
    });
    expect(screen.queryByText("Guest Character Chat")).toBeNull();
  });

  it("renders Guest Character Chat read-only config for character entities when not editing", () => {
    render(DetailStatusTab, {
      entity: mockCharacterEntity,
      isEditing: false,
      editType: "character",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: undefined,
    });
    expect(screen.getByText("Guest Character Chat")).toBeDefined();
    expect(screen.getByText(/hybrid lore/i)).toBeDefined();
    expect(screen.queryByText("Personality Rules:")).toBeNull();
    expect(screen.queryByText("Speaks with a lisp.")).toBeNull();
  });

  it("renders Guest Character Chat edit panel when editing a character entity", async () => {
    const mockConfig = {
      isEnabled: true,
      contextScope: "hybrid" as const,
      extraInstructions: "Speaks with a lisp.",
      isHostReviewable: true,
      keepMemory: true,
    };
    render(DetailStatusTab, {
      entity: mockCharacterEntity,
      isEditing: true,
      editType: "character",
      editContent: "",
      editLore: "## Secrets\nSecretly related to the king.",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: mockConfig,
    });

    expect(screen.getByText("Guest Character Chat")).toBeDefined();
    const checkbox = screen.getByLabelText(
      "Enable Guest Character Chat",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Toggle check
    await fireEvent.click(checkbox);
    expect(mockConfig.isEnabled).toBe(false);
  });

  it("calls generatedPersonality logic when chat is enabled without rules", async () => {
    const { generatePersonality } = await import("./generate-personality");
    vi.mocked(generatePersonality).mockImplementationOnce(
      async ({ setEditLore }) => {
        setEditLore("## Personality & Voice\n- Mocked rule");
        return true;
      },
    );

    const mockConfig = {
      isEnabled: false,
      contextScope: "public" as const,
      extraInstructions: "",
      isHostReviewable: true,
      keepMemory: true,
    };

    render(DetailStatusTab, {
      entity: { ...mockCharacterEntity, guestChatConfig: mockConfig },
      isEditing: true,
      editType: "character",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: mockConfig,
    });

    const checkbox = screen.getByLabelText(
      "Enable Guest Character Chat",
    ) as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(mockConfig.isEnabled).toBe(true);
    await waitFor(() => {
      expect(screen.getByText("Found in character lore")).toBeTruthy();
    });
    expect(generatePersonality).toHaveBeenCalledOnce();
  });

  it("marks the Generate button busy while personality generation is pending", async () => {
    const { generatePersonality } = await import("./generate-personality");
    let releaseGeneration!: () => void;
    vi.mocked(generatePersonality).mockImplementationOnce(
      async ({ setGenerating }) => {
        setGenerating(true);
        await new Promise<void>((resolve) => {
          releaseGeneration = resolve;
        });
        setGenerating(false);
        return true;
      },
    );

    const mockConfig = {
      isEnabled: false,
      contextScope: "public" as const,
      extraInstructions: "",
      isHostReviewable: true,
      keepMemory: true,
    };

    render(DetailStatusTab, {
      entity: { ...mockCharacterEntity, guestChatConfig: mockConfig },
      isEditing: true,
      editType: "character",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: mockConfig,
    });

    const checkbox = screen.getByLabelText(
      "Enable Guest Character Chat",
    ) as HTMLInputElement;
    await fireEvent.click(checkbox);

    const busyBtn = await waitFor(() => {
      const btn = screen
        .getByText("Generating...")
        .closest("button") as HTMLButtonElement;
      expect(btn).toBeTruthy();
      return btn;
    });
    expect(busyBtn.getAttribute("aria-busy")).toBe("true");
    expect(busyBtn.disabled).toBe(true);

    releaseGeneration();
    await waitFor(() => {
      const idleBtn = screen
        .getByText("Generate")
        .closest("button") as HTMLButtonElement;
      expect(idleBtn.getAttribute("aria-busy")).not.toBe("true");
      expect(idleBtn.disabled).toBe(false);
    });
  });

  it("keeps prompting for manual personality rules when AI generation fails", async () => {
    const { generatePersonality } = await import("./generate-personality");
    vi.mocked(generatePersonality).mockImplementationOnce(
      async ({ setError }) => {
        setError("AI generation failed.");
        return false;
      },
    );
    const mockConfig = {
      isEnabled: false,
      contextScope: "public" as const,
      extraInstructions: "",
      isHostReviewable: true,
      keepMemory: true,
    };

    render(DetailStatusTab, {
      entity: { ...mockCharacterEntity, guestChatConfig: mockConfig },
      isEditing: true,
      editType: "character",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
      editGuestChatConfig: mockConfig,
    });

    const checkbox = screen.getByLabelText(
      "Enable Guest Character Chat",
    ) as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(mockConfig.isEnabled).toBe(true);
    await waitFor(() => {
      expect(screen.getByText(/AI generation failed/i)).toBeTruthy();
    });
  });
});
