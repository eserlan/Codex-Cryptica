/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MentionText from "./MentionText.svelte";

const mention = {
  entityId: "e-elara",
  displayName: "Elara Voss",
  entityType: "character",
  start: 7,
  end: 18,
};
const text = "who is @Elara Voss?";

describe("MentionText", () => {
  it("renders plain text when there are no mentions", () => {
    const { container } = render(MentionText, {
      props: {
        text: "just a question",
        mentions: [],
        lookup: () => undefined,
        onOpen: vi.fn(),
      },
    });
    expect(container.textContent).toBe("just a question");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a resolved mention as an accessible link that opens the entity", async () => {
    const onOpen = vi.fn();
    render(MentionText, {
      props: { text, mentions: [mention], lookup: () => "Elara Voss", onOpen },
    });
    const link = screen.getByRole("button", { name: "Open Elara Voss" });
    await fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledWith("e-elara");
  });

  it("shows the live title after the entity is renamed, not the stored name", () => {
    render(MentionText, {
      props: {
        text,
        mentions: [mention],
        lookup: () => "Elara Vossberg",
        onOpen: vi.fn(),
      },
    });
    expect(screen.getByRole("button").textContent).toContain("Elara Vossberg");
  });

  it("shows an unavailable mention as text with no link when the entity is gone", () => {
    const { container } = render(MentionText, {
      props: {
        text,
        mentions: [mention],
        lookup: () => undefined,
        onOpen: vi.fn(),
      },
    });
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.textContent).toContain("@Elara Voss");
    expect(screen.getByLabelText(/entity unavailable/i)).toBeTruthy();
  });

  it("keeps the text readable when a stored mention no longer matches", () => {
    const { container } = render(MentionText, {
      props: {
        text: "who is @Elora?",
        mentions: [mention],
        lookup: () => "Elara Voss",
        onOpen: vi.fn(),
      },
    });
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.textContent).toBe("who is @Elora?");
  });
});
