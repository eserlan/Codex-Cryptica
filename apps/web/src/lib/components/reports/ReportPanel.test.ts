/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
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

  it("disables options that have nothing to show, and says why", () => {
    render(ReportPanel, {
      props: {
        input: { ...input, relationships: [] },
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    const relationships = screen.getByLabelText(
      "Relationships",
    ) as HTMLInputElement;
    const factions = screen.getByLabelText(
      "Factions and affiliations",
    ) as HTMLInputElement;
    expect(relationships.disabled).toBe(true);
    expect(factions.disabled).toBe(true);
    expect(
      screen.getByText("No relationships between these entities."),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Descriptions") as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it("keeps options enabled when the report has relationships and members", () => {
    render(ReportPanel, {
      props: {
        input: { ...input, factionMembership: { f: ["a"] } },
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    expect(
      (screen.getByLabelText("Relationships") as HTMLInputElement).disabled,
    ).toBe(false);
    expect(
      (screen.getByLabelText("Factions and affiliations") as HTMLInputElement)
        .disabled,
    ).toBe(false);
    expect(screen.queryByText(/No relationships between/)).toBeNull();
  });

  const twoSources = {
    ...input,
    relationships: [
      {
        sourceId: "a",
        targetId: "b",
        label: "friend",
        sources: ["canvas" as const],
      },
      {
        sourceId: "b",
        targetId: "a",
        label: "ally",
        sources: ["graph" as const],
      },
    ],
  };
  const panel = (over: Record<string, unknown> = {}) =>
    render(ReportPanel, {
      props: {
        input: twoSources,
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
        ...over,
      },
    });

  it("lets canvas lines and graph connections be turned off separately", async () => {
    const { container } = panel();
    expect(container.textContent).toContain("Vargas — friend → Lajos");
    expect(container.textContent).toContain("Lajos — ally → Vargas");

    await fireEvent.click(screen.getByLabelText("Connections from the graph"));
    expect(container.textContent).toContain("Vargas — friend → Lajos");
    expect(container.textContent).not.toContain("Lajos — ally → Vargas");

    await fireEvent.click(screen.getByLabelText("Lines drawn on the canvas"));
    expect(container.textContent).not.toContain("Vargas — friend → Lajos");
  });

  it("only offers canvas lines for canvas reports", () => {
    panel({ source: { origin: "graph" as const } });
    expect(screen.queryByLabelText("Lines drawn on the canvas")).toBeNull();
    expect(screen.getByLabelText("Connections from the graph")).toBeTruthy();
  });

  it("disables a connection source that has nothing in this report", () => {
    panel({
      input: {
        ...twoSources,
        relationships: [twoSources.relationships[0]],
      },
    });
    expect(
      (screen.getByLabelText("Connections from the graph") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      screen.getByText("No graph connections between these entities."),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Lines drawn on the canvas") as HTMLInputElement)
        .disabled,
    ).toBe(false);
  });

  it("greys out the source options when Relationships is off", async () => {
    panel();
    await fireEvent.click(screen.getByLabelText("Relationships"));
    expect(
      (screen.getByLabelText("Lines drawn on the canvas") as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("does not offer a Notes option", () => {
    render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    expect(screen.queryByLabelText("Notes")).toBeNull();
    expect(screen.getByLabelText("Descriptions")).toBeTruthy();
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
    const panel = screen.getByTestId("report-panel");
    await fireEvent.click(screen.getByTestId("report-cancel"));
    expect(onclose).toHaveBeenCalled();
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(save).not.toHaveBeenCalled();
  });

  it("does not close while a save is pending", async () => {
    let finishSave!: (value: { entityId: string; created: true }) => void;
    save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const onclose = vi.fn();
    render(ReportPanel, {
      props: { input, source: canvasSource, defaultTitle: "T", onclose },
    });

    await fireEvent.click(screen.getByTestId("report-save"));
    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onclose).not.toHaveBeenCalled();

    finishSave({ entityId: "new", created: true });
    await vi.waitFor(() => expect(onclose).toHaveBeenCalledOnce());
  });

  it("keeps keyboard focus inside the dialog", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    render(ReportPanel, {
      props: {
        input,
        source: canvasSource,
        defaultTitle: "T",
        onclose: vi.fn(),
      },
    });
    const dialog = screen.getByRole("dialog");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );

    const buttons = dialog.querySelectorAll<HTMLButtonElement>(
      "button:not([disabled])",
    );
    buttons[buttons.length - 1].focus();
    await fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(
      dialog.querySelector('button[aria-label="Close"]'),
    );

    trigger.remove();
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
