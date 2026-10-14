/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/components/oracle/OracleChat.svelte", async () => {
  const mod = await import("./oracle-chat-test-stub.svelte");
  return { default: mod.default };
});

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    init: vi.fn(),
    isLoading: false,
    messages: [],
    clearMessages: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));

import OraclePage from "./+page.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

describe("standalone Oracle keyboard inset", () => {
  beforeEach(() => {
    layoutUIStore.isMobile = false;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lifts the mobile chat above the keyboard and resets when it closes", async () => {
    const fullHeight = window.innerHeight;
    const viewport = Object.assign(new EventTarget(), {
      height: fullHeight,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);
    layoutUIStore.isMobile = true;

    render(OraclePage);

    const container = screen.getByTestId("standalone-oracle-container");
    expect(container.style.height).toBe("");

    viewport.height = fullHeight - 320;
    viewport.dispatchEvent(new Event("resize"));
    await waitFor(() =>
      expect(container.style.height).toBe(`${fullHeight - 320}px`),
    );
    expect(container.style.top).toBe("0px");

    viewport.height = fullHeight;
    viewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(container.style.height).toBe(""));
    expect(container.style.bottom).toBe("");
  });

  it("does not apply a desktop viewport shrink as a keyboard inset", async () => {
    const fullHeight = window.innerHeight;
    const viewport = Object.assign(new EventTarget(), {
      height: fullHeight - 320,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);

    render(OraclePage);

    const container = screen.getByTestId("standalone-oracle-container");
    await waitFor(() => expect(container.style.height).toBe(""));
    expect(container.style.bottom).toBe("");
  });
});
