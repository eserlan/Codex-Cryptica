/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("./VTTChat.svelte", () => ({
  default: function VTTChatMock() {
    return {};
  },
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    chatMessages: [],
    clearChatMessages: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    isGuestMode: false,
    confirm: vi.fn().mockResolvedValue(true),
  },
}));

import VTTChatSidebar from "./VTTChatSidebar.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { uiStore } from "$lib/stores/ui.svelte";

describe("VTTChatSidebar", () => {
  it("renders a host-only clear button that is disabled when the chat is empty", () => {
    render(VTTChatSidebar);

    expect(
      screen
        .getByRole("button", { name: "Clear VTT Chat" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("renders the expanded chat sidebar by default", () => {
    render(VTTChatSidebar);

    expect(screen.getByLabelText("VTT Chat Sidebar")).not.toBeNull();
    expect(screen.getByText("VTT Chat")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Collapse VTT Chat Sidebar" }),
    ).not.toBeNull();
  });

  it("toggles between collapsed and expanded states", async () => {
    render(VTTChatSidebar);

    await fireEvent.click(
      screen.getByRole("button", { name: "Collapse VTT Chat Sidebar" }),
    );

    expect(
      screen.getByRole("button", { name: "Expand VTT Chat Sidebar" }),
    ).not.toBeNull();
    expect(screen.getByText("Chat")).not.toBeNull();
  });

  it("clears chat after confirmation when the host clicks clear", async () => {
    mapSession.chatMessages = [
      {
        type: "CHAT_MESSAGE",
        sender: "GM",
        senderId: "host",
        content: "hello",
        timestamp: Date.now(),
      },
    ];
    render(VTTChatSidebar);

    await fireEvent.click(
      screen.getByRole("button", { name: "Clear VTT Chat" }),
    );

    expect(uiStore.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Clear VTT Chat",
        isDangerous: true,
      }),
    );
    expect(mapSession.clearChatMessages).toHaveBeenCalled();
  });

  it("hides the clear button for guests", () => {
    uiStore.isGuestMode = true;

    render(VTTChatSidebar);

    expect(screen.queryByRole("button", { name: "Clear VTT Chat" })).toBeNull();
  });
});
