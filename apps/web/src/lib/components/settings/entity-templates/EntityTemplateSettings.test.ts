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

// Sharing uses the real vault registry and device storage; these tests only
// need the settings screen, so give it a fake publish store.
vi.mock(
  "$lib/stores/entity-templates/entity-template-publish-store.svelte",
  () => ({
    entityTemplatePublishStore: {},
  }),
);
vi.mock(
  "$lib/components/community-templates/EntityTemplatePublishModal.svelte",
  async () => ({
    default: (await import("./__fakes__/FakePublishModal.svelte")).default,
  }),
);

import EntityTemplateSettings from "./EntityTemplateSettings.svelte";
import { makeStore } from "$lib/stores/entity-templates/test-helpers";
import { downloadText } from "$lib/utils/download";

function makePublishStore(over: Record<string, unknown> = {}) {
  return {
    loadLinks: vi.fn(async () => undefined),
    linkFor: vi.fn(() => undefined),
    publishState: vi.fn((t: any) =>
      t.source === "user" ? { kind: "publish" } : { kind: "duplicate-first" },
    ),
    loadOwnerMeta: vi.fn(async () => ({
      description: "d",
      labels: ["Fantasy"],
    })),
    unpublish: vi.fn(async () => undefined),
    update: vi.fn(async () => ({})),
    remove: vi.fn(async () => undefined),
    ...over,
  } as any;
}

async function mount(
  opts: Parameters<typeof makeStore>[0] = {},
  publishStore = makePublishStore(),
) {
  const ctx = makeStore(opts);
  await ctx.store.loadForVault("v1", { vault: ctx.vault });
  render(EntityTemplateSettings, { store: ctx.store as any, publishStore });
  return { ...ctx, publishStore };
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

  it("links to the community Entity templates tab", async () => {
    await mount();
    const link = screen.getByTestId("browse-community-entity-templates");
    expect(link.getAttribute("href")).toContain("/templates?kind=entity");
  });

  it("keeps the community link in a read-only vault without edit actions", async () => {
    await mount({ readOnly: true });
    expect(
      screen
        .getByTestId("browse-community-entity-templates")
        .getAttribute("href"),
    ).toContain("/templates?kind=entity");
    expect(screen.queryByTestId("entity-template-new")).toBeNull();
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

  it("links entity template settings to the community Entity directory", async () => {
    await mount();
    const link = screen.getByTestId(
      "browse-community-entity-templates",
    ) as HTMLAnchorElement;
    expect(link.textContent).toContain("Browse community templates");
    expect(link.getAttribute("href")).toBe("/templates?kind=entity");
  });

  it("keeps the community directory link in a read-only vault", async () => {
    await mount({ readOnly: true });
    const link = screen.getByTestId(
      "browse-community-entity-templates",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/templates?kind=entity");
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
    render(EntityTemplateSettings, {
      store: ctx.store as any,
      publishStore: makePublishStore(),
    });
    expect(
      screen.getByTestId("entity-template-warnings").textContent,
    ).toContain("bad.json");
  });

  describe("sharing", () => {
    it("offers Publish on a user template and opens the publish dialog", async () => {
      const ctx = await mount();
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));
      await fireEvent.click(within(row).getByTestId("entity-template-publish"));
      expect(screen.getByTestId("fake-publish-modal").textContent).toContain(
        "publish:Mine",
      );
    });

    it("explains that a built-in template must be duplicated first", async () => {
      await mount();
      const row = rowFor("Standard Character");
      const button = within(row).getByTestId("entity-template-publish");
      expect(button.getAttribute("title")).toMatch(
        /duplicate this template first/i,
      );
      await fireEvent.click(button);
      expect(notify).toHaveBeenCalledWith(
        expect.stringMatching(/duplicate this template first/i),
        "info",
      );
      expect(screen.queryByTestId("fake-publish-modal")).toBeNull();
    });

    it("shows update, unpublish and delete for a published template instead of publish", async () => {
      const publishStore = makePublishStore({
        publishState: vi.fn((t: any) =>
          t.source === "user"
            ? { kind: "published", link: { status: "active" } }
            : { kind: "duplicate-first" },
        ),
        linkFor: vi.fn(() => ({ listingId: "L1", status: "active" })),
      });
      const ctx = await mount({}, publishStore);
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));
      expect(
        within(row).getByTestId("entity-template-published-badge").textContent,
      ).toBe("Published");
      expect(within(row).queryByTestId("entity-template-publish")).toBeNull();
      await fireEvent.click(
        within(row).getByTestId("entity-template-unpublish"),
      );
      await waitFor(() => expect(publishStore.unpublish).toHaveBeenCalled());
    });

    it("confirms before deleting the public listing, and can cancel without a request", async () => {
      const publishStore = makePublishStore({
        publishState: vi.fn((t: any) =>
          t.source === "user"
            ? { kind: "published", link: { status: "active" } }
            : { kind: "duplicate-first" },
        ),
      });
      const ctx = await mount({}, publishStore);
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));

      confirm.mockResolvedValueOnce(false);
      await fireEvent.click(
        within(row).getByTestId("entity-template-delete-listing"),
      );
      await waitFor(() => expect(confirm).toHaveBeenCalled());
      expect(publishStore.remove).not.toHaveBeenCalled();

      await fireEvent.click(
        within(row).getByTestId("entity-template-delete-listing"),
      );
      await waitFor(() => expect(publishStore.remove).toHaveBeenCalled());
    });

    it("shows a Republish action for an unpublished template", async () => {
      const publishStore = makePublishStore({
        publishState: vi.fn((t: any) =>
          t.source === "user"
            ? { kind: "published", link: { status: "unpublished" } }
            : { kind: "duplicate-first" },
        ),
      });
      const ctx = await mount({}, publishStore);
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));
      expect(
        within(row).getByTestId("entity-template-published-badge").textContent,
      ).toBe("Unpublished");
      await fireEvent.click(
        within(row).getByTestId("entity-template-republish"),
      );
      await waitFor(() => expect(publishStore.update).toHaveBeenCalled());
    });

    it("warns that a published template's listing stays when the local one is deleted", async () => {
      const publishStore = makePublishStore({
        linkFor: vi.fn(() => ({ listingId: "L1", status: "active" })),
        publishState: vi.fn((t: any) =>
          t.source === "user"
            ? { kind: "published", link: { status: "active" } }
            : { kind: "duplicate-first" },
        ),
      });
      const ctx = await mount({}, publishStore);
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));
      await fireEvent.click(within(row).getByTestId("entity-template-delete"));
      await waitFor(() => expect(confirm).toHaveBeenCalled());
      expect((confirm.mock.calls.at(-1)![0] as any).message).toMatch(
        /stays in the directory until you unpublish or delete/i,
      );
    });

    it("hides sharing actions in a read-only vault", async () => {
      await mount({ readOnly: true });
      expect(screen.queryAllByTestId("entity-template-publish")).toHaveLength(
        0,
      );
    });

    it("reports a failed sharing action instead of failing silently", async () => {
      const { EntityTemplateDirectoryError } =
        await import("$lib/services/publishing/PublicEntityTemplateDirectoryService");
      const publishStore = makePublishStore({
        publishState: vi.fn((t: any) =>
          t.source === "user"
            ? { kind: "published", link: { status: "active" } }
            : { kind: "duplicate-first" },
        ),
        unpublish: vi
          .fn()
          .mockRejectedValue(
            new EntityTemplateDirectoryError(
              "Could not unpublish the template.",
            ),
          ),
      });
      const ctx = await mount({}, publishStore);
      await ctx.store.create({
        name: "Mine",
        entityType: "location",
        markdown: "## x\n",
      });
      const row = await waitFor(() => rowFor("Mine"));
      await fireEvent.click(
        within(row).getByTestId("entity-template-unpublish"),
      );
      await waitFor(() =>
        expect(notify).toHaveBeenCalledWith(
          "Could not unpublish the template.",
          "error",
        ),
      );
    });
  });
});
