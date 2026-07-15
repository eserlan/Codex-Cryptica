// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import PublicListingSettings from "./PublicListingSettings.svelte";

describe("PublicListingSettings", () => {
  it("blocks public listing until a guest snapshot exists", () => {
    render(PublicListingSettings, {
      props: {
        publishId: "",
        writeToken: "",
        vaultTitle: "Night Market",
        service: {
          getPublicListing: vi.fn(),
        } as any,
      },
    });

    expect(screen.getByTestId("public-listing-blocked")).toBeTruthy();
  });

  it("shows validation copy and enables a public listing", async () => {
    const enablePublicListing = vi.fn(async () => ({
      schemaVersion: 1,
      publishId: "pub-123",
      guestUrl: "/guest/pub-123",
      title: "Night Market",
      description: "Find smugglers and rumors.",
      labels: ["cyberpunk"],
      visibleEntityCount: 1,
      snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
      listingCreatedAt: "2026-06-30T12:00:00.000Z",
      listingUpdatedAt: "2026-06-30T12:00:00.000Z",
    }));
    const notifications = { notify: vi.fn() };

    const createListingDraft = vi.fn(({ publishId, vaultTitle }) => ({
      publishId,
      title: vaultTitle,
      description: "",
      labels: [],
      rightsAcknowledged: false,
    }));

    render(PublicListingSettings, {
      props: {
        publishId: "pub-123",
        writeToken: "write-token-123",
        vaultTitle: "Night Market",
        service: {
          getPublicListing: vi.fn(async () => null),
          getNotice: vi.fn(async () => null),
          createListingDraft,
          enablePublicListing,
          saveNotice: vi.fn(async () => ({
            publishId: "pub-123",
            fanContent: false,
          })),
          disablePublicListing: vi.fn(),
        } as any,
        notificationStore: notifications,
      },
    });

    await waitFor(() => {
      expect(createListingDraft).toHaveBeenCalled();
    });

    await fireEvent.click(screen.getByTestId("public-listing-save"));
    expect(screen.getByTestId("public-listing-validation").textContent).toMatch(
      /acknowledge your publishing rights/i,
    );

    await fireEvent.click(
      screen.getByTestId("public-listing-rights-acknowledgement"),
    );
    await fireEvent.click(screen.getByTestId("public-listing-save"));
    expect(screen.getByTestId("public-listing-validation").textContent).toMatch(
      /add a public title, description, and at least one label/i,
    );
    expect(
      screen.getByTestId("public-listing-confirmation").textContent,
    ).toMatch(/anyone can find this world in the public directory/i);

    await fireEvent.input(screen.getByTestId("public-listing-description"), {
      target: { value: "Find smugglers and rumors." },
    });
    await fireEvent.input(screen.getByTestId("public-listing-labels"), {
      target: { value: "cyberpunk" },
    });
    await fireEvent.click(screen.getByTestId("public-listing-save"));

    await waitFor(() => {
      expect(enablePublicListing).toHaveBeenCalledWith(
        "pub-123",
        expect.objectContaining({
          title: "Night Market",
          description: "Find smugglers and rumors.",
          labels: ["cyberpunk"],
          rightsAcknowledged: true,
        }),
        "write-token-123",
      );
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      "Public listing saved.",
      "success",
    );
  });

  it("hydrates from the saved listing instead of later vault-name changes", async () => {
    render(PublicListingSettings, {
      props: {
        publishId: "pub-123",
        writeToken: "write-token-123",
        vaultTitle: "Current Vault Name",
        service: {
          getPublicListing: vi.fn(async () => ({
            schemaVersion: 1,
            publishId: "pub-123",
            guestUrl: "/guest/pub-123",
            title: "Saved Public Name",
            description: "Saved public description",
            labels: ["cyberpunk"],
            visibleEntityCount: 1,
            snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
            listingCreatedAt: "2026-06-30T12:00:00.000Z",
            listingUpdatedAt: "2026-06-30T12:00:00.000Z",
          })),
          getNotice: vi.fn(async () => ({
            schemaVersion: 1,
            publishId: "pub-123",
            fanContent: false,
            rightsAcknowledgedAt: "2026-06-30T12:00:00.000Z",
          })),
          createListingDraft: vi.fn(({ existingListing }) => ({
            publishId: existingListing.publishId,
            title: existingListing.title,
            description: existingListing.description,
            labels: existingListing.labels,
            rightsAcknowledged: true,
          })),
          enablePublicListing: vi.fn(),
          saveNotice: vi.fn(),
          disablePublicListing: vi.fn(),
        } as any,
      },
    });

    await waitFor(() => {
      expect(
        (screen.getByTestId("public-listing-title") as HTMLInputElement).value,
      ).toBe("Saved Public Name");
    });
    expect(screen.getByTestId("public-listing-preview").textContent).toContain(
      "Saved Public Name",
    );
  });

  it("delists an existing public listing without removing the guest snapshot", async () => {
    const disablePublicListing = vi.fn(async () => undefined);
    const notifications = { notify: vi.fn() };

    render(PublicListingSettings, {
      props: {
        publishId: "pub-123",
        writeToken: "write-token-123",
        vaultTitle: "Night Market",
        service: {
          getPublicListing: vi.fn(async () => ({
            schemaVersion: 1,
            publishId: "pub-123",
            guestUrl: "/guest/pub-123",
            title: "Night Market",
            description: "Find smugglers and rumors.",
            labels: ["cyberpunk"],
            visibleEntityCount: 1,
            snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
            listingCreatedAt: "2026-06-30T12:00:00.000Z",
            listingUpdatedAt: "2026-06-30T12:00:00.000Z",
          })),
          createListingDraft: vi.fn(({ existingListing }) => ({
            publishId: existingListing.publishId,
            title: existingListing.title,
            description: existingListing.description,
            labels: existingListing.labels,
          })),
          enablePublicListing: vi.fn(),
          disablePublicListing,
        } as any,
        notificationStore: notifications,
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("public-listing-delist")).toBeTruthy();
    });
    expect(
      screen.getByTestId("public-listing-destination").textContent,
    ).toMatch(/read-only guest view/i);

    await fireEvent.click(screen.getByTestId("public-listing-delist"));
    await waitFor(() => {
      expect(disablePublicListing).toHaveBeenCalledWith(
        "pub-123",
        "write-token-123",
      );
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      "Public listing removed.",
      "success",
    );
  });

  it("enables fan content toggle, enters disclaimer, and saves notice sidecar", async () => {
    const saveNotice = vi.fn(async () => ({
      publishId: "pub-123",
      fanContent: true,
      fanContentDisclaimer: "Fan work.",
      rightsAcknowledgedAt: "2026-07-10T12:00:00.000Z",
    }));
    const enablePublicListing = vi.fn(async () => ({
      publishId: "pub-123",
      title: "Night Market Fan Edition",
      description: "Smugglers.",
      labels: ["cyberpunk"],
    }));

    const createListingDraft = vi.fn(({ publishId, vaultTitle }) => ({
      publishId,
      title: vaultTitle,
      description: "Smugglers.",
      labels: ["cyberpunk"],
      rightsAcknowledged: false,
    }));

    render(PublicListingSettings, {
      props: {
        publishId: "pub-123",
        writeToken: "write-token-123",
        vaultTitle: "Night Market Fan Edition",
        service: {
          getPublicListing: vi.fn(async () => null),
          getNotice: vi.fn(async () => null),
          createListingDraft,
          enablePublicListing,
          saveNotice,
          disablePublicListing: vi.fn(),
        } as any,
      },
    });

    await waitFor(() => {
      expect(createListingDraft).toHaveBeenCalled();
    });

    await fireEvent.click(
      screen.getByTestId("public-listing-rights-acknowledgement"),
    );
    await fireEvent.click(screen.getByTestId("public-listing-fan-content"));

    expect(screen.getByTestId("public-listing-fan-disclaimer")).toBeTruthy();
    await fireEvent.input(screen.getByTestId("public-listing-fan-disclaimer"), {
      target: { value: "Fan work." },
    });

    await fireEvent.click(screen.getByTestId("public-listing-save"));

    await waitFor(() => {
      expect(saveNotice).toHaveBeenCalledWith(
        "pub-123",
        {
          fanContent: true,
          fanContentDisclaimer: "Fan work.",
          rightsAcknowledged: true,
        },
        "write-token-123",
      );
    });
  });

  it("displays a suspended/under-review warning banner when notice.suspended === true", async () => {
    const createListingDraft = vi.fn(() => ({
      title: "Suspended World",
      description: "Under review",
      labels: ["test"],
      coverImageAssetId: "",
      ownerDisplayName: "",
      rightsAcknowledged: true,
      fanContent: false,
    }));

    render(PublicListingSettings, {
      props: {
        publishId: "pub-suspended",
        writeToken: "write-token-123",
        vaultTitle: "Suspended World",
        service: {
          getPublicListing: vi.fn(async () => null),
          getNotice: vi.fn(async () => ({
            fanContent: false,
            suspended: true,
            rightsAcknowledgedAt: "2026-07-10T00:00:00.000Z",
          })),
          createListingDraft,
          enablePublicListing: vi.fn(),
          saveNotice: vi.fn(),
          disablePublicListing: vi.fn(),
        } as any,
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("public-listing-suspended-banner"),
      ).toBeTruthy();
    });
  });
});
