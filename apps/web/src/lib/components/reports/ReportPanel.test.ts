/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportInput } from "entity-report-engine";

// Stub Element.prototype.animate for JSDOM / Svelte 5 transitions compatibility.
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as any;
}

const { save, openZenMode, notify } = vi.hoisted(() => ({
  save: vi.fn(),
  openZenMode: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { resolveImageUrl: vi.fn(async () => "blob:portrait") },
}));
vi.mock("$lib/services/report-service", () => ({
  reportService: { save },
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openZenMode },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify },
}));

import ReportPanel from "./ReportPanel.svelte";

const input: ReportInput = {
  entities: [
    {
      id: "a",
      title: "Vargas",
      type: "character",
      labels: [],
      description: "A rogue.",
      notes: "Extra notes.",
      secrets: "Secret plan.",
    },
    { id: "b", title: "Lajos", type: "character", labels: [] },
  ],
  relationships: [{ sourceId: "a", targetId: "b", label: "friend" }],
  factionMembership: {},
};

const canvasSource = {
  origin: "canvas" as const,
  canvasId: "cv",
  selection: "entire" as const,
};

describe("ReportPanel", () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue({ entityId: "new", created: true });
    openZenMode.mockClear();
    notify.mockClear();
  });

  it("shows a preview with GM-only content off by default", () => {
    render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    expect(screen.getByText("Vargas")).toBeTruthy();
    expect(screen.queryByText("Secret plan.")).toBeNull();
  });

  it("updates the preview when options change", async () => {
    render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    await fireEvent.click(screen.getByLabelText("GM-only secrets"));
    expect(screen.getByText("Secret plan.")).toBeTruthy();
    expect(screen.getByTestId("report-preview-gm-only")).toBeTruthy();
    await fireEvent.click(screen.getByLabelText("Descriptions"));
    expect(screen.queryByText("A rogue.")).toBeNull();
  });

  it("saves once, closes and opens the new note in Zen", async () => {
    const onclose = vi.fn();
    render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "Party report",
        onclose,
      },
    });
    await fireEvent.click(screen.getByTestId("report-save"));
    await vi.waitFor(() => expect(openZenMode).toHaveBeenCalledWith("new"));
    expect(save).toHaveBeenCalledTimes(1);
    const [, options] = save.mock.calls[0];
    expect(options.title).toBe("Party report");
    expect(options.provenance).toMatchObject({
      origin: "canvas",
      canvasId: "cv",
      detail: "standard",
    });
    expect(options.provenance.include.gmOnlySecrets).toBe(false);
    expect(onclose).toHaveBeenCalled();
  });

  it("writes nothing when cancelled", async () => {
    const onclose = vi.fn();
    render(ReportPanel, {
      props: { input, source: canvasSource, defaultTitle: "T", onclose },
    });
    await fireEvent.click(screen.getByTestId("report-cancel"));
    expect(onclose).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("tells the user when saving fails and stays open", async () => {
    save.mockRejectedValueOnce(new Error("disk"));
    const onclose = vi.fn();
    render(ReportPanel, {
      props: { input, source: canvasSource, defaultTitle: "T", onclose },
    });
    await fireEvent.click(screen.getByTestId("report-save"));
    await vi.waitFor(() => expect(notify).toHaveBeenCalled());
    expect(onclose).not.toHaveBeenCalled();
    expect(openZenMode).not.toHaveBeenCalled();
  });

  it("shows Scope only for canvas reports and rescopes", async () => {
    const rescope = vi.fn(() => ({
      input: null,
      source: { ...canvasSource, selection: "selected" as const },
      error: "no-selection",
    }));
    const { unmount } = render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "T",
        rescope,
        onclose: vi.fn(),
      },
    });
    expect(screen.getByTestId("report-scope")).toBeTruthy();
    await fireEvent.click(screen.getByLabelText("Selected nodes only"));
    expect(rescope).toHaveBeenCalledWith("selected");
    expect(screen.getByTestId("report-panel-empty").textContent).toContain(
      "Nothing is selected",
    );
    expect(
      (screen.getByTestId("report-save") as HTMLButtonElement).disabled,
    ).toBe(true);
    unmount();

    render(ReportPanel, {
      props: {
        input,
        source: { origin: "graph", entityIds: ["a", "b"] },
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    expect(screen.queryByTestId("report-scope")).toBeNull();
  });
});
