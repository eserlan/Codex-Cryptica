/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import EntityMentionPicker from "./EntityMentionPicker.svelte";

const suggestions = [
  {
    entityId: "e1",
    title: "Elara Voss",
    entityType: "character",
    descriptor: "The Grand Archmage.",
  },
  { entityId: "e2", title: "Elara Brook", entityType: "location" },
];

describe("EntityMentionPicker", () => {
  it("lists each suggestion with its title, type and descriptor", () => {
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 0, loading: false, onSelect: vi.fn() },
    });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain("Elara Voss");
    expect(options[0].textContent).toContain("character");
    expect(options[0].textContent).toContain("The Grand Archmage.");
  });

  it("marks the active option as selected for assistive tech", () => {
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 1, loading: false, onSelect: vi.fn() },
    });
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("aria-selected")).toBe("false");
    expect(options[1].getAttribute("aria-selected")).toBe("true");
  });

  it("selects a suggestion on click and reports its index", async () => {
    const onSelect = vi.fn();
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 0, loading: false, onSelect },
    });
    await fireEvent.click(screen.getAllByRole("option")[1]);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("shows a no-match message and no options when the list is empty", () => {
    render(EntityMentionPicker, {
      props: {
        suggestions: [],
        activeIndex: 0,
        loading: false,
        onSelect: vi.fn(),
      },
    });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toMatch(
      /no entities match/i,
    );
  });

  it("shows a loading state instead of options while loading", () => {
    render(EntityMentionPicker, {
      props: {
        suggestions: [],
        activeIndex: 0,
        loading: true,
        onSelect: vi.fn(),
      },
    });
    expect(screen.getByRole("status").textContent).toMatch(/searching/i);
  });

  it("announces the number of results to screen readers", () => {
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 0, loading: false, onSelect: vi.fn() },
    });
    expect(screen.getByRole("status").textContent).toMatch(/2 results/);
  });

  it("announces the highlighted entity as the user arrows through the list", () => {
    const { rerender } = render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 0, loading: false, onSelect: vi.fn() },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Elara Voss/);
    rerender({
      suggestions,
      activeIndex: 1,
      loading: false,
      onSelect: vi.fn(),
    });
    expect(screen.getByRole("status").textContent).toMatch(/Elara Brook/);
  });

  it("points aria-activedescendant at the highlighted option", () => {
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 1, loading: false, onSelect: vi.fn() },
    });
    const list = screen.getByRole("listbox");
    const active = list.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toBe(
      screen.getAllByRole("option")[1],
    );
  });

  it("sizes the list from the visual viewport so the soft keyboard does not hide it", () => {
    const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 300,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    try {
      render(EntityMentionPicker, {
        props: {
          suggestions,
          activeIndex: 0,
          loading: false,
          onSelect: vi.fn(),
        },
      });
      expect(screen.getByRole("listbox").style.maxHeight).toBe("150px");
    } finally {
      if (original) Object.defineProperty(window, "visualViewport", original);
      else delete (window as any).visualViewport;
    }
  });

  it("keeps a usable minimum list height on a very short visual viewport", () => {
    const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 100,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    try {
      render(EntityMentionPicker, {
        props: {
          suggestions,
          activeIndex: 0,
          loading: false,
          onSelect: vi.fn(),
        },
      });
      expect(screen.getByRole("listbox").style.maxHeight).toBe("120px");
    } finally {
      if (original) Object.defineProperty(window, "visualViewport", original);
      else delete (window as any).visualViewport;
    }
  });

  it("keeps focus in the composer when an option is pressed", async () => {
    render(EntityMentionPicker, {
      props: { suggestions, activeIndex: 0, loading: false, onSelect: vi.fn() },
    });
    const option = screen.getAllByRole("option")[0];
    const notPrevented = await fireEvent.mouseDown(option);
    expect(notPrevented).toBe(false);
  });
});
