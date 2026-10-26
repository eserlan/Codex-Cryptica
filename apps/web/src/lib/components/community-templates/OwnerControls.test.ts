/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock(
  "$lib/stores/entity-templates/entity-template-publish-store.svelte",
  () => ({
    entityTemplatePublishStore: {},
  }),
);

import OwnerControls from "./OwnerControls.svelte";

const listing = (status: "active" | "unpublished" = "active") =>
  ({ listingId: "L1", status }) as any;

function fakeStore(over: Record<string, unknown> = {}) {
  return {
    hasOwnerToken: vi.fn(async () => true),
    ownerStatus: vi.fn(async () => "active" as const),
    unpublishListing: vi.fn(async () => undefined),
    republishListing: vi.fn(async () => ({}) as any),
    deleteListing: vi.fn(async () => undefined),
    recover: vi.fn(async () => ({
      status: "linked",
      templateId: "t1",
      listing: listing(),
    })),
    relink: vi.fn(async () => undefined),
    installCopyAndLink: vi.fn(async () => ({}) as any),
    ...over,
  } as any;
}

describe("OwnerControls for an active listing", () => {
  it("offers Unpublish and Delete permanently, and Update when a template is linked", async () => {
    const onUpdate = vi.fn();
    render(OwnerControls, { listingId: "L1", store: fakeStore(), onUpdate });
    expect(await screen.findByText("Unpublish")).toBeTruthy();
    expect(screen.getByText("Delete permanently")).toBeTruthy();
    expect(screen.queryByText("Republish")).toBeNull();
    await fireEvent.click(screen.getByText("Update"));
    expect(onUpdate).toHaveBeenCalled();
  });

  it("hides Update when no local template is linked", async () => {
    render(OwnerControls, { listingId: "L1", store: fakeStore() });
    await screen.findByText("Unpublish");
    expect(screen.queryByText("Update")).toBeNull();
  });

  it("unpublishes and then offers Republish", async () => {
    const store = fakeStore();
    const onChanged = vi.fn();
    render(OwnerControls, { listingId: "L1", store, onChanged });
    await fireEvent.click(await screen.findByText("Unpublish"));
    expect(await screen.findByText("Republish")).toBeTruthy();
    expect(store.unpublishListing).toHaveBeenCalledWith("L1");
    expect(onChanged).toHaveBeenCalledWith("unpublished");
  });
});

describe("OwnerControls for an unpublished listing", () => {
  it("offers Republish, not Unpublish", async () => {
    const store = fakeStore({ ownerStatus: vi.fn(async () => "unpublished") });
    render(OwnerControls, { listingId: "L1", store });
    const republish = await screen.findByText("Republish");
    expect(screen.queryByText("Unpublish")).toBeNull();
    await fireEvent.click(republish);
    await waitFor(() =>
      expect(store.republishListing).toHaveBeenCalledWith("L1"),
    );
    expect(await screen.findByText("Unpublish")).toBeTruthy();
  });
});

describe("permanent delete", () => {
  it("asks for explicit confirmation and sends nothing until confirmed", async () => {
    const store = fakeStore();
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.click(await screen.findByText("Delete permanently"));
    expect(screen.getByRole("alertdialog").textContent).toMatch(
      /can't be\s+undone/i,
    );
    expect(store.deleteListing).not.toHaveBeenCalled();
  });

  it("can be cancelled without any request", async () => {
    const store = fakeStore();
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.click(await screen.findByText("Delete permanently"));
    await fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(store.deleteListing).not.toHaveBeenCalled();
    expect(screen.getByText("Unpublish")).toBeTruthy();
  });

  it("deletes after confirmation and says the local template is unchanged", async () => {
    const store = fakeStore();
    const onChanged = vi.fn();
    render(OwnerControls, { listingId: "L1", store, onChanged });
    await fireEvent.click(await screen.findByText("Delete permanently"));
    await fireEvent.click(screen.getByText("Yes, delete permanently"));
    expect(await screen.findByText(/was deleted/i)).toBeTruthy();
    expect(store.deleteListing).toHaveBeenCalledWith("L1");
    expect(onChanged).toHaveBeenCalledWith("deleted");
  });

  it("keeps the controls and offers retry when the delete fails", async () => {
    const store = fakeStore({
      deleteListing: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("Could not delete the template listing."),
        )
        .mockResolvedValueOnce(undefined),
    });
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.click(await screen.findByText("Delete permanently"));
    await fireEvent.click(screen.getByText("Yes, delete permanently"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("Could not delete the template listing."),
    ).toBeTruthy();
    expect(screen.getByText("Unpublish")).toBeTruthy();
    await fireEvent.click(screen.getByText("Yes, delete permanently"));
    expect(await screen.findByText(/was deleted/i)).toBeTruthy();
  });
});

describe("recovery", () => {
  const noToken = (over: Record<string, unknown> = {}) =>
    fakeStore({ hasOwnerToken: vi.fn(async () => false), ...over });

  it("asks for the token when the device does not hold one, then restores controls", async () => {
    const store = noToken();
    render(OwnerControls, { listingId: "L1", store });
    const input = await screen.findByLabelText("Owner token");
    expect((screen.getByText("Recover") as HTMLButtonElement).disabled).toBe(
      true,
    );
    await fireEvent.input(input, { target: { value: "tok" } });
    await fireEvent.click(screen.getByText("Recover"));
    expect(await screen.findByText("Unpublish")).toBeTruthy();
    expect(store.recover).toHaveBeenCalledWith("L1", "tok");
  });

  it("shows a wrong-token message and stays in recovery", async () => {
    const store = noToken({
      recover: vi.fn(async () => {
        throw new Error("That owner token isn't right for this listing.");
      }),
    });
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.input(await screen.findByLabelText("Owner token"), {
      target: { value: "bad" },
    });
    await fireEvent.click(screen.getByText("Recover"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Unpublish")).toBeNull();
  });

  it("lets the user choose among several matching templates", async () => {
    const store = noToken({
      recover: vi.fn(async () => ({
        status: "choose",
        listing: listing(),
        candidates: [
          { id: "a", name: "First" },
          { id: "b", name: "Second" },
        ],
      })),
    });
    store.hasOwnerToken.mockResolvedValueOnce(false).mockResolvedValue(true);
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.input(await screen.findByLabelText("Owner token"), {
      target: { value: "tok" },
    });
    await fireEvent.click(screen.getByText("Recover"));
    await fireEvent.click(await screen.findByText("Second"));
    await waitFor(() => expect(store.relink).toHaveBeenCalledWith("L1", "b"));
    expect(await screen.findByText("Unpublish")).toBeTruthy();
  });

  it("offers to add a copy when no template matches", async () => {
    const store = noToken({
      recover: vi.fn(async () => ({ status: "none", listing: listing() })),
    });
    store.hasOwnerToken.mockResolvedValueOnce(false).mockResolvedValue(true);
    render(OwnerControls, { listingId: "L1", store });
    await fireEvent.input(await screen.findByLabelText("Owner token"), {
      target: { value: "tok" },
    });
    await fireEvent.click(screen.getByText("Recover"));
    await fireEvent.click(await screen.findByText("Add it to my templates"));
    await waitFor(() =>
      expect(store.installCopyAndLink).toHaveBeenCalledWith("L1"),
    );
  });
});
