/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ConnectionCreator from "./ConnectionCreator.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    addConnection: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/components/ui/Autocomplete.svelte", async () => {
  const mod = await import("../entity-detail/MockAutocomplete.svelte");
  return {
    default: mod.default,
  };
});

describe("ConnectionCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a new connection and trims the custom label", async () => {
    const onCancel = vi.fn();
    const onConnectionAdded = vi.fn();

    render(ConnectionCreator, {
      entityId: "entity-1",
      initialTargetId: "target-1",
      initialTargetName: "Target 1",
      onCancel,
      onConnectionAdded,
    });

    const labelInput = screen.getByLabelText(
      /custom label \(optional\)/i,
    ) as HTMLInputElement;
    await fireEvent.input(labelInput, { target: { value: "  Trusted Ally  " } });

    await fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(vault.addConnection).toHaveBeenCalledWith(
        "entity-1",
        "target-1",
        "related_to",
        "Trusted Ally",
      );
    });

    expect(onConnectionAdded).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByTestId("mock-autocomplete") as HTMLInputElement).value,
    ).toBe("");
    expect(labelInput.value).toBe("");
  });

  it("shows a validation error when no target is selected", async () => {
    render(ConnectionCreator, {
      entityId: "entity-1",
      onCancel: vi.fn(),
      onConnectionAdded: vi.fn(),
    });

    await fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(screen.getByText("Please select a target entity.")).toBeTruthy();
    expect(vault.addConnection).not.toHaveBeenCalled();
  });

  it("rejects attempts to connect an entity to itself", async () => {
    render(ConnectionCreator, {
      entityId: "entity-1",
      initialTargetId: "entity-1",
      initialTargetName: "Entity 1",
      onCancel: vi.fn(),
      onConnectionAdded: vi.fn(),
    });

    await fireEvent.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(
      screen.getByText("Cannot connect an entity to itself."),
    ).toBeTruthy();
    expect(vault.addConnection).not.toHaveBeenCalled();
  });

  it("synchronizes prefilled target props into local form state", async () => {
    const { rerender } = render(ConnectionCreator, {
      entityId: "entity-1",
      initialTargetId: "target-1",
      initialTargetName: "Target 1",
      onCancel: vi.fn(),
      onConnectionAdded: vi.fn(),
    });

    expect(
      (screen.getByTestId("mock-autocomplete") as HTMLInputElement).value,
    ).toBe("Target 1");

    await rerender({
      entityId: "entity-1",
      initialTargetId: "parent-entity",
      initialTargetName: "Parent Entity",
      onCancel: vi.fn(),
      onConnectionAdded: vi.fn(),
    });

    await waitFor(() => {
      expect(
        (screen.getByTestId("mock-autocomplete") as HTMLInputElement).value,
      ).toBe("Parent Entity");
    });
  });
});
