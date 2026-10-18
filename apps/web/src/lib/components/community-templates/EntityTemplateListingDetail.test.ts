/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: { openHelpToArticle: vi.fn() },
}));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock("$lib/stores/entity-templates/entity-template-store.svelte", () => ({
  entityTemplateStore: { canEdit: true },
}));
vi.mock(
  "$lib/stores/entity-templates/entity-template-publish-store.svelte",
  () => ({
    entityTemplatePublishStore: {
      links: {},
      loadLinks: vi.fn(async () => undefined),
      hasOwnerToken: vi.fn(async () => false),
    },
  }),
);
vi.mock("$lib/stores/entity-templates/entity-template-install", () => ({
  installEntityTemplateFromListing: vi.fn(),
}));

import EntityTemplateListingDetail from "./EntityTemplateListingDetail.svelte";

const detail = {
  schemaVersion: 1,
  templateKind: "entity",
  listingId: "l1",
  title: "Guild Hall",
  description: "A place for guilds.",
  entityType: "location",
  labels: ["Fantasy", "Dark"],
  ownerDisplayName: "Ada",
  packageVersion: 1,
  status: "active",
  listingCreatedAt: "2026-01-01T00:00:00.000Z",
  listingUpdatedAt: "2026-03-05T00:00:00.000Z",
  previewMarkdown: "## Rooms\n\nBig.\n",
} as any;

describe("EntityTemplateListingDetail", () => {
  it("shows the description, type, labels, attribution and the note preview", () => {
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    expect(screen.getByRole("heading", { name: "Guild Hall" })).toBeTruthy();
    expect(screen.getByText("A place for guilds.")).toBeTruthy();
    expect(screen.getByText("Location")).toBeTruthy();
    expect(screen.getByText("Fantasy")).toBeTruthy();
    expect(screen.getByText(/By Ada/)).toBeTruthy();
    expect(screen.getByTestId("entity-template-preview").textContent).toBe(
      "## Rooms\n\nBig.\n",
    );
  });

  it("is never offered to search engines", () => {
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute("content"),
    ).toBe("noindex");
  });

  it("offers a report action that opens the report dialog", async () => {
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    await fireEvent.click(screen.getByText("Report this template"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/What's wrong with it/)).toBeTruthy();
  });

  it("opens the install dialog", async () => {
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    await fireEvent.click(screen.getByText("Install"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("disables Install with an explanation when the vault cannot be changed", () => {
    render(EntityTemplateListingDetail, {
      detail,
      listingId: "l1",
      canInstall: () => false,
    });
    expect((screen.getByText("Install") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByTestId("install-unavailable")).toBeTruthy();
    // Preview still works.
    expect(screen.getByTestId("entity-template-preview")).toBeTruthy();
  });

  it("offers owner recovery to the author without cluttering the public view", async () => {
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    expect(screen.queryByTestId("owner-controls")).toBeNull();
    await fireEvent.click(screen.getByText("I published this template"));
    expect(await screen.findByTestId("owner-controls")).toBeTruthy();
  });

  it("lets the author recover controls even when the listing is unpublished", async () => {
    render(EntityTemplateListingDetail, { detail: null, listingId: "l1" });
    await fireEvent.click(screen.getByText("I published this template"));
    expect(await screen.findByLabelText("Owner token")).toBeTruthy();
  });

  it("shows a recoverable message for an unavailable listing", () => {
    render(EntityTemplateListingDetail, { detail: null, listingId: "l1" });
    expect(screen.getByRole("alert").textContent).toMatch(
      /no longer available/i,
    );
    expect(screen.getByText(/Back to community templates/)).toBeTruthy();
    expect(screen.queryByText("Install")).toBeNull();
  });
});

describe("EntityTemplateListingDetail after the owner removes the listing", () => {
  it("stops showing the listing once the owner controls report it unpublished", async () => {
    const { entityTemplatePublishStore } =
      await import("$lib/stores/entity-templates/entity-template-publish-store.svelte");
    Object.assign(entityTemplatePublishStore, {
      hasOwnerToken: vi.fn(async () => true),
      ownerStatus: vi.fn(async () => "active"),
      unpublishListing: vi.fn(async () => undefined),
    });
    render(EntityTemplateListingDetail, { detail, listingId: "l1" });
    await fireEvent.click(await screen.findByText("Unpublish"));
    expect(await screen.findByText(/no longer available/i)).toBeTruthy();
    expect(screen.queryByText("Install")).toBeNull();
  });
});
