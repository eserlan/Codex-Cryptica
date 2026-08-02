/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DetailChatsTab from "./DetailChatsTab.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    loadTranscriptsForCharacter: vi.fn().mockResolvedValue([]),
    updateEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: {
    transcripts: {},
    isGenerating: false,
    startChat: vi.fn(),
    sendMessage: vi.fn(),
    saveMessageEdit: vi.fn(),
    deleteMessage: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    resumeSession: vi.fn(),
    startNewSession: vi.fn(),
  },
}));

vi.mock("$lib/stores/proposer.svelte", () => ({
  proposerStore: { promoteToRumor: vi.fn() },
}));

describe("DetailChatsTab", () => {
  const character = {
    id: "char-1",
    title: "Mara the Blacksmith",
    type: "character",
    lore: "## Personality & Voice\nSpeaks plainly.",
    guestChatConfig: {
      isEnabled: true,
      contextScope: "public",
      extraInstructions: "Speaks plainly.",
      isHostReviewable: true,
      keepMemory: true,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    guestChatStore.transcripts = {};
  });

  it("lets a host start a private character conversation from the Chats tab", async () => {
    render(DetailChatsTab, { entity: character });

    expect(screen.getByText("Character Chat")).toBeTruthy();
    expect(
      screen.getByText(
        "Try this character yourself. Your conversation stays in this browser and is not added to guest logs.",
      ),
    ).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(guestChatStore.startChat).toHaveBeenCalledWith(
      "char-1",
      "Mara the Blacksmith",
      undefined,
    );
  });
});
