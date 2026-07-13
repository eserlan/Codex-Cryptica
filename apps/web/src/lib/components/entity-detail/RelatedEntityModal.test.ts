vi.mock("@codex/ai-engine", () => ({
  textGenerationService: {
    generateRelatedEntity: vi.fn().mockResolvedValue({
      name: "Generated Name",
      type: "character",
      summary: "Generated summary.",
      description: "Generated description.",
      labels: ["generated-label"],
      plotHook: "Generated plot hook",
      relationshipBack: "rival",
    }),
  },
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

/** @vitest-environment jsdom */

import { render, fireEvent, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RelatedEntityModal from "./RelatedEntityModal.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { textGenerationService } from "@codex/ai-engine";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

const mockDiscoveryPolicyStore = vi.hoisted(() => ({
  aiDisabled: false,
}));

const mockOracle = vi.hoisted(() => ({
  effectiveApiKey: "test-api-key",
  settingsManager: {
    apiKey: "test-api-key",
    modelName: "test-model-name",
  },
  ui: {
    isOpen: false,
    activeSettingsTab: "",
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {
      "source-id": {
        id: "source-id",
        title: "Source Entity",
        type: "location",
        content: "Source content",
        lore: "Source lore",
        connections: [],
      },
    },
    inboundConnections: {},
    createEntity: vi.fn().mockResolvedValue("new-entity-id"),
    addConnection: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "character", label: "Character" },
      { id: "location", label: "Location" },
      { id: "item", label: "Item" },
    ],
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: mockDiscoveryPolicyStore,
}));

vi.mock("$lib/services/EntityTemplateService.svelte", () => ({
  entityTemplateService: {
    resolveTemplate: vi.fn().mockResolvedValue("Resolved template outline"),
  },
}));

describe("RelatedEntityModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoveryPolicyStore.aiDisabled = false;
    mockOracle.effectiveApiKey = "test-api-key";
    mockOracle.settingsManager.apiKey = "test-api-key";
    (vault as any).isGuest = false;
    if (typeof window !== "undefined") {
      Element.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve(),
        cancel: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
      } as any);
    }
  });

  it("renders correctly in configure stage when open", () => {
    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    expect(screen.getByText("Generate Related Entity")).toBeDefined();
    expect(screen.getByText("Source Entity")).toBeDefined();
    expect(screen.getByLabelText("Target Entity Type")).toBeDefined();
    expect(screen.getByLabelText("Relationship / Role")).toBeDefined();
  });

  it("handles custom relationship text input rendering", async () => {
    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    const select = screen.getByLabelText(
      "Relationship / Role",
    ) as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: "custom" } });

    expect(screen.getByLabelText("Custom Relationship Label")).toBeDefined();
  });

  it("triggers AI generation, shows loading state, and transitions to review screen", async () => {
    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    const generateBtn = screen.getByText("Generate");
    await fireEvent.click(generateBtn);

    expect(textGenerationService.generateRelatedEntity).toHaveBeenCalled();
    expect(textGenerationService.generateRelatedEntity).toHaveBeenCalledWith(
      "test-api-key",
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.any(Array),
      expect.any(String),
      expect.objectContaining({ aiDisabled: false }),
    );

    await waitFor(() => {
      const nameInput = screen.getByLabelText(
        "Entity Name",
      ) as HTMLInputElement;
      expect(nameInput.value).toBe("Generated Name");

      const summaryText = screen.getByLabelText(
        "Summary (Player-facing chronicle snippet)",
      ) as HTMLTextAreaElement;
      expect(summaryText.value).toBe("Generated summary.");

      const descText = screen.getByLabelText(
        "Description / Lore (GM-facing details)",
      ) as HTMLTextAreaElement;
      expect(descText.value).toBe("Generated description.");

      const labelsInput = screen.getByLabelText(
        "Labels (Comma-separated)",
      ) as HTMLInputElement;
      expect(labelsInput.value).toBe("generated-label");

      const relationBackInput = screen.getByLabelText(
        "Relationship Label (Source → New Entity)",
      ) as HTMLInputElement;
      expect(relationBackInput.value).toBe("rival");
    });
  });

  it("does not call generation and shows settings prompt when AI is disabled", async () => {
    mockDiscoveryPolicyStore.aiDisabled = true;

    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    expect(screen.getByText("AI Features Disabled")).toBeDefined();
    expect(screen.queryByText("Generate")).toBeNull();
    expect(textGenerationService.generateRelatedEntity).not.toHaveBeenCalled();
  });

  it("does not show generation controls for guest sessions", async () => {
    (vault as any).isGuest = true;

    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    expect(screen.getByText("Host Only")).toBeDefined();
    expect(screen.queryByText("Generate")).toBeNull();
    expect(textGenerationService.generateRelatedEntity).not.toHaveBeenCalled();
  });

  it("allows generation when AI is enabled without a custom API key", async () => {
    mockOracle.effectiveApiKey = "";
    mockOracle.settingsManager.apiKey = "";

    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: vi.fn(),
    });

    const generateBtn = screen.getByText("Generate");
    await fireEvent.click(generateBtn);

    expect(textGenerationService.generateRelatedEntity).toHaveBeenCalledWith(
      "",
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Array),
      expect.any(Array),
      expect.any(String),
      expect.objectContaining({ aiDisabled: false }),
    );
  });

  it("saves the new entity and connects back on click Create Entity", async () => {
    const onCloseMock = vi.fn();
    render(RelatedEntityModal, {
      isOpen: true,
      sourceEntityId: "source-id",
      onClose: onCloseMock,
    });

    const generateBtn = screen.getByText("Generate");
    await fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText("Create Entity")).toBeDefined();
    });

    const createBtn = screen.getByText("Create Entity");
    await fireEvent.click(createBtn);

    expect(vault.createEntity).toHaveBeenCalledWith(
      "character",
      "Generated Name",
      {
        content: "Generated summary.",
        lore: "Generated description.",
        labels: ["generated-label"],
        plot_hook: "Generated plot hook",
      },
    );

    expect(vault.addConnection).toHaveBeenCalledWith(
      "source-id",
      "new-entity-id",
      "related_to",
      "rival",
    );
    expect(notificationStore.notify).toHaveBeenCalledWith(
      'Entity "Generated Name" created successfully!',
      "success",
    );
    expect(onCloseMock).toHaveBeenCalled();
  });
});
