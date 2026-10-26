/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NodeReadModal from "./NodeReadModal.svelte";

const { copyContent, modalUIStore } = vi.hoisted(() => ({
  copyContent: vi.fn().mockResolvedValue(true),
  modalUIStore: {
    readModeNodeId: "entity-1",
    openReadMode: vi.fn(),
    closeReadMode: vi.fn(),
  },
}));

vi.mock("$lib/services/ClipboardService", () => ({
  clipboardService: { copyContent },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({ modalUIStore }));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {
      "entity-1": {
        id: "entity-1",
        title: "The Hollow Crown",
        type: "faction",
        content: "# Chronicle\n\nThe gates are sealed.",
        labels: [],
        connections: [],
      },
    },
    inboundConnections: {},
    loadEntityContent: vi.fn(),
  },
}));
vi.mock("$lib/services/parser", () => ({
  parserService: { parse: vi.fn().mockResolvedValue("<h1>Chronicle</h1>") },
}));
vi.mock("$lib/stores/categories.svelte", () => ({
  categories: { getCategory: vi.fn().mockReturnValue({ icon: "file" }) },
}));
vi.mock("$lib/utils/icon", () => ({
  getIconClass: vi.fn().mockReturnValue("icon"),
}));
vi.mock("$lib/actions/focusTrap", () => ({
  focusTrap: () => ({ destroy: () => {} }),
}));

describe("NodeReadModal", () => {
  beforeEach(() => {
    copyContent.mockClear();
    copyContent.mockResolvedValue(true);
  });

  it("delegates entity Markdown and rendered HTML to ClipboardService", async () => {
    render(NodeReadModal);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Copy Content" })).toBeTruthy(),
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    await fireEvent.click(screen.getByRole("button", { name: "Copy Content" }));

    expect(copyContent).toHaveBeenCalledWith({
      markdown: "# Chronicle\n\nThe gates are sealed.",
      html: "<h1>Chronicle</h1>",
    });
  });
});
