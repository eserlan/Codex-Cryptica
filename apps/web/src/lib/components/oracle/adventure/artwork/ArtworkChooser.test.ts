import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ArtworkChooser from "./ArtworkChooser.svelte";

const options = [{ id: "a", label: "Forest path", credit: "Codex Cryptica" }];

describe("artwork controls", () => {
  it("lets a player select an eligible illustration and close the chooser", async () => {
    const choose = vi.fn(async () => true);
    render(ArtworkChooser, {
      props: {
        options,
        choose,
        keep: vi.fn(),
        dismiss: vi.fn(),
        restore: vi.fn(),
      },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose another" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Forest path" }));
    expect(choose).toHaveBeenCalledWith("a");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Forest path" })).toBeNull(),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Choose another" }),
    );
  });
  it("cancels without changing the saved selection", async () => {
    const choose = vi.fn();
    render(ArtworkChooser, {
      props: {
        options,
        choose,
        keep: vi.fn(),
        dismiss: vi.fn(),
        restore: vi.fn(),
      },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose another" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(choose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Choose another" }),
    );
  });
  it("keeps the chooser open and reports a failed save", async () => {
    render(ArtworkChooser, {
      props: {
        options,
        choose: async () => false,
        keep: vi.fn(),
        dismiss: vi.fn(),
        restore: vi.fn(),
      },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: "Choose another" }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Forest path" }));
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Could not save that choice. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Forest path" })).toBeTruthy();
  });
  it("disables all controls in read-only mode", () => {
    render(ArtworkChooser, {
      props: {
        options,
        readOnly: true,
        choose: vi.fn(),
        keep: vi.fn(),
        dismiss: vi.fn(),
        restore: vi.fn(),
      },
    });
    for (const button of screen.getAllByRole("button"))
      expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
