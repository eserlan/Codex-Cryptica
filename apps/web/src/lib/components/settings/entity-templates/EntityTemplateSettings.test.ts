/** @vitest-environment jsdom */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { confirm, notify } = vi.hoisted(() => ({
  confirm: vi.fn().mockResolvedValue(true),
  notify: vi.fn(),
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { confirm, notify },
}));

vi.mock("$lib/utils/download", () => ({ downloadText: vi.fn() }));

import EntityTemplateSettings from "./EntityTemplateSettings.svelte";
import { makeStore } from "$lib/stores/entity-templates/test-helpers";
import { downloadText } from "$lib/utils/download";

async function mount(opts: Parameters<typeof makeStore>[0] = {}) {
  const ctx = makeStore(opts);
  await ctx.store.loadForVault("v1", { vault: ctx.vault });
  render(EntityTemplateSettings, { store: ctx.store as any });
  return ctx;
}

const rowFor = (name: string) =>
  screen
    .getAllByTestId("entity-template-row")
    .find((r) => within(r).queryByText(name))!;

describe("EntityTemplateSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirm.mockResolvedValue(true);
  });

  it("lists built-in templates grouped by type with exactly one Default per type", async () => {
    await mount();
    const groups = screen.getAllByTestId("entity-template-group");
    expect(groups.length).toBeGreaterThan(3);
    for (const group of groups) {
      expect(
        within(group).getAllByTestId("entity-template-default"),
      ).toHaveLength(1);
      expect(
        within(group).getAllByTestId("entity-template-source")[0].textContent,
      ).toBe("Built-in");
    }
    expect(screen.getByText("Standard Character")).toBeTruthy();
  });

  it("previews a template as the note it produces", async () => {
    await mount();
    await fireEvent.click(
      within(rowFor("Standard Character")).getByTestId(
        "entity-template-preview-toggle",
      ),
    );
    expect(screen.getByTestId("entity-template-preview").textContent).toContain(
      "## Summary",
    );
  });

  it("offers only Preview, Duplicate, Set as default and Export on built-ins", async () => {
    await mount();
    const row = rowFor("Standard Faction");
    expect(within(row).queryByTestId("entity-template-edit")).toBeNull();
    expect(within(row).queryByTestId("entity-template-delete")).toBeNull();
    expect(within(row).getByTestId("entity-template-duplicate")).toBeTruthy();
    expect(within(row).getByTestId("entity-template-export")).toBeTruthy();
  });

  it("duplicating a built-in adds a user template that can be edited and deleted", async () => {
    await mount();
    await fireEvent.click(
      within(rowFor("Standard Faction")).getByTestId(
        "entity-template-duplicate",
      ),
    );
    const copy = await waitFor(() => rowFor("Standard Faction (copy)"));
    expect(within(copy).getByTestId("entity-template-source").textContent).toBe(
      "Yours",
    );
    expect(within(copy).getByTestId("entity-template-edit")).toBeTruthy();
    expect(within(copy).getByTestId("entity-template-delete")).toBeTruthy();
  });

  it("ignores a rapid second click while an action is running", async () => {
    await mount();
    const button = within(rowFor("Standard Faction")).getByTestId(
      "entity-template-duplicate",
    );
    await fireEvent.click(button);
    await fireEvent.click(button);
    await waitFor(() => rowFor("Standard Faction (copy)"));
    expect(screen.getAllByText("Standard Faction (copy)")).toHaveLength(1);
  });

  it("sets a duplicate as the default and moves the marker", async () => {
    await mount();
    await fireEvent.click(
      within(rowFor("Standard Faction")).getByTestId(
        "entity-template-duplicate",
      ),
    );
    const copy = await waitFor(() => rowFor("Standard Faction (copy)"));
    await fireEvent.click(
      within(copy).getByTestId("entity-template-set-default"),
    );
    await waitFor(() =>
      expect(
        within(rowFor("Standard Faction (copy)")).queryByTestId(
          "entity-template-default",
        ),
      ).toBeTruthy(),
    );
    expect(
      within(rowFor("Standard Faction")).queryByTestId(
        "entity-template-default",
      ),
    ).toBeNull();
  });

  it("deleting asks for confirmation and declining keeps the template", async () => {
    await mount();
    await fireEvent.click(
      within(rowFor("Standard Faction")).getByTestId(
        "entity-template-duplicate",
      ),
    );
    const copy = await waitFor(() => rowFor("Standard Faction (copy)"));
    confirm.mockResolvedValueOnce(false);
    await fireEvent.click(within(copy).getByTestId("entity-template-delete"));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(rowFor("Standard Faction (copy)")).toBeTruthy();

    await fireEvent.click(
      within(rowFor("Standard Faction (copy)")).getByTestId(
        "entity-template-delete",
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText("Standard Faction (copy)")).toBeNull(),
    );
  });

  it("creates a new template through the editor", async () => {
    await mount();
    await fireEvent.click(screen.getByTestId("entity-template-new"));
    await fireEvent.input(screen.getByTestId("entity-template-name"), {
      target: { value: "Settlement" },
    });
    await fireEvent.input(screen.getByTestId("entity-template-markdown"), {
      target: { value: "## Geography\n" },
    });
    await fireEvent.click(screen.getByTestId("entity-template-save"));
    await waitFor(() => expect(screen.getByText("Settlement")).toBeTruthy());
  });

  it("exports a template as a json download", async () => {
    await mount();
    await fireEvent.click(
      within(rowFor("Standard Character")).getByTestId(
        "entity-template-export",
      ),
    );
    expect(downloadText).toHaveBeenCalledWith(
      expect.stringContaining('"kind": "entity-template"'),
      "standard-character.template.json",
      "application/json",
    );
  });

  it("shows a clear error for a corrupt import and adds nothing", async () => {
    await mount();
    const before = screen.getAllByTestId("entity-template-row").length;
    const input = screen.getByTestId(
      "entity-template-import-input",
    ) as HTMLInputElement;
    const file = new File(["{not json"], "bad.json", {
      type: "application/json",
    });
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByTestId("entity-template-import-error")).toBeTruthy(),
    );
    expect(screen.getAllByTestId("entity-template-row")).toHaveLength(before);
  });

  it("imports a valid template file", async () => {
    await mount();
    const pkg = {
      kind: "entity-template",
      formatVersion: 1,
      template: {
        name: "From a friend",
        entityType: "location",
        markdown: "## Vibes\n",
      },
    };
    const input = screen.getByTestId(
      "entity-template-import-input",
    ) as HTMLInputElement;
    const file = new File([JSON.stringify(pkg)], "t.json", {
      type: "application/json",
    });
    await fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("From a friend")).toBeTruthy());
  });

  it("is view-only in a read-only vault, with an explanation", async () => {
    await mount({ readOnly: true });
    expect(screen.getByTestId("entity-template-readonly")).toBeTruthy();
    expect(screen.queryByTestId("entity-template-new")).toBeNull();
    expect(screen.queryByTestId("entity-template-import")).toBeNull();
    expect(screen.queryAllByTestId("entity-template-set-default")).toHaveLength(
      0,
    );
    expect(screen.queryAllByTestId("entity-template-duplicate")).toHaveLength(
      0,
    );
    // Preview and export stay available.
    expect(
      screen.getAllByTestId("entity-template-preview-toggle").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByTestId("entity-template-export").length,
    ).toBeGreaterThan(0);
  });

  it("shows a visible warning when files were skipped", async () => {
    const ctx = makeStore();
    (ctx.repository.loadAll as any).mockResolvedValue({
      templates: [],
      defaults: { version: 1, defaults: {} },
      legacy: [],
      warnings: ['Skipped "bad.json" because it couldn\'t be read.'],
    });
    await ctx.store.loadForVault("v1", { vault: ctx.vault });
    render(EntityTemplateSettings, { store: ctx.store as any });
    expect(
      screen.getByTestId("entity-template-warnings").textContent,
    ).toContain("bad.json");
  });
});
