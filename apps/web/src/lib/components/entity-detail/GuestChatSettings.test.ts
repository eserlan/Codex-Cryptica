/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuestChatSettings from "./GuestChatSettings.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("./generate-personality", () => ({
  generatePersonality: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    updateEntity: vi.fn().mockResolvedValue(true),
  },
}));

describe("GuestChatSettings", () => {
  const character = {
    id: "char-1",
    title: "Mara the Blacksmith",
    type: "character",
    content: "A patient blacksmith.",
    lore: "## Personality & Voice\n- Speaks plainly.",
    guestChatConfig: {
      isEnabled: true,
      contextScope: "hybrid",
      extraInstructions: "Speaks plainly.",
      isHostReviewable: true,
      keepMemory: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the current guest-chat settings in the Chats tab when not editing", () => {
    render(GuestChatSettings, {
      entity: character,
      isEditing: false,
      editContent: "",
    });

    expect(screen.getByText("Guest Character Chat")).toBeTruthy();
    expect(screen.getByText("Enabled")).toBeTruthy();
    expect(screen.getByText(/hybrid lore/i)).toBeTruthy();
  });

  it("saves the availability toggle without entering edit mode", async () => {
    render(GuestChatSettings, {
      entity: {
        ...character,
        guestChatConfig: { ...character.guestChatConfig, isEnabled: false },
      },
      isEditing: false,
      editContent: "",
    });

    await fireEvent.click(screen.getByRole("checkbox"));

    expect(vault.updateEntity).toHaveBeenCalledWith("char-1", {
      guestChatConfig: {
        ...character.guestChatConfig,
        isEnabled: true,
      },
    });
  });

  it("shows an error when saving the availability toggle fails", async () => {
    vi.mocked(vault.updateEntity).mockResolvedValueOnce(false);
    render(GuestChatSettings, {
      entity: character,
      isEditing: false,
      editContent: "",
    });

    await fireEvent.click(screen.getByRole("checkbox"));

    expect(
      await screen.findByText("Could not update guest chat. Try again."),
    ).toBeTruthy();
  });

  it("enables guest chat from the Chats tab and reveals its configuration", async () => {
    const config = {
      isEnabled: false,
      contextScope: "public" as const,
      extraInstructions: "",
      isHostReviewable: true,
      keepMemory: true,
    };

    render(GuestChatSettings, {
      entity: { ...character, guestChatConfig: config },
      isEditing: true,
      editContent: character.content,
      editLore: character.lore,
      editGuestChatConfig: config,
    });

    const checkbox = screen.getByLabelText(
      "Enable Guest Character Chat",
    ) as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(config.isEnabled).toBe(true);
    expect(screen.getByText("Context & Knowledge Scope")).toBeTruthy();
    expect(screen.getByText("Found in character lore")).toBeTruthy();
  });

  it("offers personality generation when the character has no voice guidance", async () => {
    const { generatePersonality } = await import("./generate-personality");
    vi.mocked(generatePersonality).mockImplementationOnce(
      async ({ setEditLore }) => {
        setEditLore("## Personality & Voice\n- Speaks softly.");
        return true;
      },
    );
    const config = {
      isEnabled: false,
      contextScope: "public" as const,
      extraInstructions: "",
      isHostReviewable: true,
      keepMemory: true,
    };

    render(GuestChatSettings, {
      entity: { ...character, lore: "", guestChatConfig: config },
      isEditing: true,
      editContent: character.content,
      editLore: "",
      editGuestChatConfig: config,
    });

    await fireEvent.click(screen.getByLabelText("Enable Guest Character Chat"));

    await waitFor(() => {
      expect(generatePersonality).toHaveBeenCalledOnce();
      expect(screen.getByText("Found in character lore")).toBeTruthy();
    });
  });
});
