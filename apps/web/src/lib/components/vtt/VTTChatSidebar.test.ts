/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import VTTChatSidebar from "./VTTChatSidebar.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

beforeEach(() => {
  notificationStore.confirm = vi.fn().mockResolvedValue(true);
  sessionModeStore.isGuestMode = false;
});

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
    (mapSession as any).chatMessages = [
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

    expect(notificationStore.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Clear VTT Chat",
        isDangerous: true,
      }),
    );
    expect(mapSession.clearChatMessages).toHaveBeenCalled();
  });

  it("hides the clear button for guests", () => {
    sessionModeStore.isGuestMode = true;

    render(VTTChatSidebar);

    expect(screen.queryByRole("button", { name: "Clear VTT Chat" })).toBeNull();
  });
});
