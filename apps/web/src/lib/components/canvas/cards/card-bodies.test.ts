/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {},
    resolveImageUrl: vi.fn().mockResolvedValue(null),
  },
}));
import CharacterCardBody from "./CharacterCardBody.svelte";
import FactionCardBody from "./FactionCardBody.svelte";
import LocationCardBody from "./LocationCardBody.svelte";

describe("CharacterCardBody", () => {
  it("shows the excerpt without any relationships in normal size", () => {
    render(CharacterCardBody, {
      props: {
        renderedContent: "<p>A rogue with a past.</p>",
        quote: undefined,
      },
    });

    expect(screen.getByTestId("character-card-excerpt")).toBeTruthy();
    expect(screen.queryByText("Relationships")).toBeNull();
    expect(screen.queryByTestId("grouped-relation-links")).toBeNull();
  });

  it("shows grouped links in the large version", () => {
    render(CharacterCardBody, {
      props: {
        renderedContent: "<p>A rogue with a past.</p>",
        quote: undefined,
        groups: [
          {
            key: "character",
            label: "Characters",
            rows: [
              {
                target: "a",
                title: "Lajos",
                text: "Sworn Ally",
                stance: "ally",
              },
            ],
          },
        ],
      },
    });

    expect(screen.getByText("Characters")).toBeTruthy();
    expect(screen.getByText("Lajos")).toBeTruthy();
    expect(screen.getByText("Sworn Ally")).toBeTruthy();
  });

  it("omits grouped links by default and shows them when provided", () => {
    const { rerender } = render(CharacterCardBody, {
      props: {
        renderedContent: "<p>Loner.</p>",
        quote: undefined,
      },
    });
    expect(screen.queryByTestId("grouped-relation-links")).toBeNull();

    void rerender({
      renderedContent: "<p>Loner.</p>",
      quote: undefined,
      groups: [
        {
          key: "other",
          label: "Other",
          rows: [
            {
              target: "a",
              title: "Lajos",
              text: "Friend",
              stance: "ally",
            },
          ],
        },
      ],
    });
    expect(screen.getByText("Other")).toBeTruthy();
    expect(screen.getByText("Lajos")).toBeTruthy();
  });

  it("shows an explicit quote and omits the block when absent", () => {
    const { rerender } = render(CharacterCardBody, {
      props: {
        renderedContent: "<p>A rogue.</p>",
        quote: "Protect the weak.",
      },
    });
    expect(screen.getByTestId("character-card-quote")).toBeTruthy();
    expect(screen.getByText(/Protect the weak/)).toBeTruthy();

    void rerender({
      renderedContent: "<p>A rogue.</p>",
      quote: undefined,
    });
    expect(screen.queryByTestId("character-card-quote")).toBeNull();
  });
});

describe("FactionCardBody", () => {
  it("shows member initials, the full count, and the excerpt", () => {
    render(FactionCardBody, {
      props: {
        renderedContent: "<p>Shadows over the city.</p>",
        members: [
          { id: "a", title: "Vargas", stance: "ally" },
          { id: "b", title: "Lajos", stance: "enemy" },
        ],
        memberCount: 4,
      },
    });

    const membership = screen.getByTestId("faction-card-membership");
    expect(membership.getAttribute("aria-label")).toBe("4 members");
    expect(screen.getByText("4 members")).toBeTruthy();
    expect(screen.getByTitle("Vargas")).toBeTruthy();
    expect(screen.getByTitle("Lajos")).toBeTruthy();
    expect(screen.getByTestId("faction-card-excerpt")).toBeTruthy();
  });

  it("rings member dots with their stance colour", () => {
    render(FactionCardBody, {
      props: {
        renderedContent: "",
        members: [
          { id: "a", title: "Vargas", stance: "ally" },
          { id: "b", title: "Mordak", stance: "enemy" },
        ],
        memberCount: 2,
      },
    });

    expect(screen.getByTitle("Vargas").className).toContain(
      "border-emerald-400/80",
    );
    expect(screen.getByTitle("Mordak").className).toContain(
      "border-rose-400/80",
    );
  });

  it("uses singular wording for a single member", () => {
    render(FactionCardBody, {
      props: {
        renderedContent: "",
        members: [{ id: "a", title: "Vargas", stance: "neutral" }],
        memberCount: 1,
      },
    });

    expect(screen.getByText("1 member")).toBeTruthy();
  });
});

describe("LocationCardBody", () => {
  it("shows the excerpt, coordinates, and connection count", () => {
    render(LocationCardBody, {
      props: {
        renderedContent: "<p>A buried tower.</p>",
        coordinatesText: "12, -4",
        connectionCount: 3,
      },
    });

    expect(screen.getByTestId("location-card-excerpt")).toBeTruthy();
    expect(screen.getByText("12, -4")).toBeTruthy();
    expect(screen.getByText("3 connections")).toBeTruthy();
  });

  it("omits coordinates when absent and uses singular wording", () => {
    render(LocationCardBody, {
      props: {
        renderedContent: "<p>Somewhere.</p>",
        coordinatesText: undefined,
        connectionCount: 1,
      },
    });

    const metaText = (
      screen.getByTestId("location-card-meta").textContent ?? ""
    ).replace(/\s+/g, " ");
    expect(metaText).toContain("1 connection");
    expect(screen.getByText("1 connection")).toBeTruthy();
  });
});
