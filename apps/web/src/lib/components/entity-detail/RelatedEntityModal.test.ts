/** @vitest-environment jsdom */

import { render, fireEvent, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RelatedEntityModal from "./RelatedEntityModal.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { textGenerationService } from "$lib/services/ai/text-generation.service.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

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
  oracle: {
    settingsManager: {
      apiKey: "test-api-key",
      modelName: "test-model-name",
    },
    ui: {
      isOpen: false,
      activeSettingsTab: "",
    },
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

vi.mock("$lib/services/ai/text-generation.service.svelte", () => ({
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
}));

vi.mock("$lib/services/EntityTemplateService.svelte", () => ({
  entityTemplateService: {
    resolveTemplate: vi.fn().mockResolvedValue("Resolved template outline"),
  },
}));

vi.mock("$lib/services/ai/capability-guard", () => ({
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

describe("RelatedEntityModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Polyfill Element.prototype.animate for jsdom / Svelte transitions
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
