/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HelpAssistantMessage from "./HelpAssistantMessage.svelte";

const callbacks = { onOpenArticle: vi.fn(), onOpenLibrary: vi.fn() };

describe("HelpAssistantMessage Markdown", () => {
  it("renders emphasis, lists, code, links and line breaks in answers", () => {
    const { container } = render(HelpAssistantMessage, {
      ...callbacks,
      message: {
        id: 1,
        role: "assistant",
        text: "Use **Groups** and *Redraw*.\nHover a node.\n\n- Open `Graph`\n- Read [help](/help)",
      },
    });
    expect(container.querySelector("strong")?.textContent).toBe("Groups");
    expect(container.querySelector("em")?.textContent).toBe("Redraw");
    expect(container.querySelector("br")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("code")?.textContent).toBe("Graph");
    expect(
      screen.getByRole("link", { name: "help" }).getAttribute("href"),
    ).toBe("/help");
  });

  it("renders connection alternatives as four list items with formatted controls", () => {
    const { container } = render(HelpAssistantMessage, {
      ...callbacks,
      message: {
        id: 1,
        role: "assistant",
        text: `Yes. You can also create a connection in these places:

- On an entity’s Status tab, use the Connections section and click **+ Add**, then choose the target entity and relationship label.
- In the Lore Oracle chat, type \`/connect\` (or \`/con\`) for the interactive helper.
- In the Lore Oracle chat, type \`/connect "Source" is the mentor of "Target"\` to create it directly.
- When the Connections Proposer suggests a relationship at the bottom of an entity’s detail panel, click its checkmark.`,
      },
    });
    expect(screen.getByRole("list")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(container.querySelector("strong")?.textContent).toBe("+ Add");
    expect(container.querySelectorAll("code")).toHaveLength(3);
    expect(container.querySelector("p")?.textContent).toBe(
      "Yes. You can also create a connection in these places:",
    );
  });

  it("removes scripts, event handlers and unsafe link URLs from answers", () => {
    const { container } = render(HelpAssistantMessage, {
      ...callbacks,
      message: {
        id: 1,
        role: "assistant",
        text: '<script>alert(1)</script><img src="x" onerror="alert(1)">\n\n[unsafe](javascript:alert(1)) **Safe**',
      },
    });
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("Safe");
  });

  it("keeps user questions as literal text", () => {
    const { container } = render(HelpAssistantMessage, {
      ...callbacks,
      message: {
        id: 1,
        role: "user",
        text: "**Groups** <script>alert(1)</script>",
      },
    });
    expect(container.querySelector("strong, script")).toBeNull();
    expect(container.textContent).toContain(
      "**Groups** <script>alert(1)</script>",
    );
  });
});
