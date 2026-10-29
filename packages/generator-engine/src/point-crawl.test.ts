import { describe, expect, it } from "vitest";
import {
  buildPointCrawlDiagramLayout,
  buildPointCrawlPrompt,
  buildPointCrawlSaveDrafts,
  buildPointCrawlTopology,
  checkPointCrawlPlayability,
  clampPointCount,
  fillFailedPointCrawlParts,
  formatRouteConnectionLabel,
  generatePointCrawlLocal,
  generatePointCrawlNetworkLocal,
  generatePointCrawlStaged,
  isVaguePointCrawlFact,
  normalizePointCrawlTopology,
  parsePointCrawlResponse,
  parsePointCrawlNetwork,
  pointCrawlConfig,
  pointCrawlNodeRoleSymbol,
  reachableNodesBfs,
  regeneratePointCrawlPart,
  regeneratePointCrawlPartLocal,
  renderPointCrawlGmSheet,
  renderPointCrawlMarkdown,
  renderPointCrawlRouteSummary,
  repairPointCrawlPlayability,
  resolvePointCrawl,
  simulateKeyLockReachability,
  pointCrawlRouteBudget,
  type OneShotProgressStep,
  type PointCrawlNetwork,
} from "./index";

describe("Point Crawl Topology & Playability (T004, T010)", () => {
  it("assigns role symbols and respects structural roles", () => {
    expect(pointCrawlNodeRoleSymbol({ role: "hazard" })).toBe("▲");
    expect(
      pointCrawlNodeRoleSymbol({ role: "hub", structuralRole: "chokepoint" }),
    ).toBe("◆");
    expect(
      pointCrawlNodeRoleSymbol({ role: "hub", structuralRole: "connector" }),
    ).toBe("●");
  });

  it("clamps point counts strictly to the 6-15 range", () => {
    expect(clampPointCount(2)).toBe(6);
    expect(clampPointCount(6)).toBe(6);
    expect(clampPointCount(10)).toBe(10);
    expect(clampPointCount(22)).toBe(15);
    expect(clampPointCount(Number.NaN)).toBe(8);
  });

  it("generates connected, looped, key-before-lock valid topologies across all point counts (6-15) and densities", () => {
    for (const count of pointCrawlConfig.pointCounts) {
      for (const density of pointCrawlConfig.densities) {
        const crawl = generatePointCrawlNetworkLocal({
          genre: "Classic Fantasy",
          scale: "Wilderness",
          pointCount: count,
          density,
          dangerLevel: "Moderate / Hazardous",
          secretFrequency: "Standard (1-2 secret routes)",
        });

        expect(crawl.nodes).toHaveLength(count);
        expect(crawl.routes).toHaveLength(
          pointCrawlRouteBudget(count, density),
        );
        expect(
          crawl.nodes.find((node) => node.id === crawl.startNodeId)
            ?.structuralRole,
        ).toBe("start");
        expect(
          crawl.nodes.filter((node) => node.structuralRole === "goal"),
        ).toHaveLength(crawl.goalNodeIds.length);
        expect(crawl.routes.length).toBeGreaterThanOrEqual(count); // >= 1 loop
        expect(
          crawl.routes.some(
            (r) => r.visibility === "hidden" || r.visibility === "rumoured",
          ),
        ).toBe(true);
        expect(crawl.routes.some((r) => Boolean(r.gate))).toBe(true);

        const sim = simulateKeyLockReachability(
          crawl.startNodeId,
          crawl.routes,
        );
        expect(sim.reachableNodeIds.size).toBe(count);
        expect(sim.softlockedRouteIds).toHaveLength(0);

        const issues = checkPointCrawlPlayability(crawl);
        expect(issues).toEqual([]);
      }
    }
  });

  it("prunes only safe excess routes and reports when protected edges exceed the budget", () => {
    const base = buildPointCrawlTopology({
      pointCount: 6,
      density: "Highly interconnected",
    });
    const usedPairs = new Set(
      base.routes.map((route) =>
        [route.fromNodeId, route.toNodeId].sort().join("--"),
      ),
    );
    const pair = base.nodes
      .flatMap((from, index) =>
        base.nodes.slice(index + 1).map((to) => [from, to] as const),
      )
      .find(
        ([from, to]) => !usedPairs.has([from.id, to.id].sort().join("--")),
      )!;
    const extra = {
      ...base.routes[0],
      id: "excess-route",
      fromNodeId: pair[0].id,
      toNodeId: pair[1].id,
      gate: undefined,
      visibility: "obvious" as const,
      isLoopOrShortcut: false,
    };
    const repaired = normalizePointCrawlTopology({
      ...base,
      routes: [...base.routes, extra],
    });
    expect(repaired.routes).toHaveLength(base.routes.length);
    expect(
      checkPointCrawlPlayability(repaired).some(
        (issue) => issue.code === "density-exceeded",
      ),
    ).toBe(false);

    const protectedNetwork = {
      ...base,
      routes: [
        ...base.routes.map((route) => ({ ...route, isLoopOrShortcut: true })),
        { ...extra, visibility: "hidden" as const, isLoopOrShortcut: true },
      ],
    };
    const unrepaired = normalizePointCrawlTopology(protectedNetwork);
    expect(
      checkPointCrawlPlayability(unrepaired).some(
        (issue) => issue.code === "density-exceeded",
      ),
    ).toBe(true);

    const planProtected = normalizePointCrawlTopology({
      ...base,
      routes: [
        ...base.routes.map((route) => ({ ...route, isLoopOrShortcut: true })),
        extra,
      ],
      adventurePlan: {
        ...base.adventurePlan!,
        outcomes: base.adventurePlan!.outcomes.map((outcome) => ({
          ...outcome,
          requirementRouteIds: [extra.id],
        })),
      },
    });
    expect(planProtected.routes.some((route) => route.id === extra.id)).toBe(
      true,
    );
  });

  it("matches travel time and terrain vocabulary to each scale (Dungeon, Settlement, City, Wilderness, Region, Planet / System)", () => {
    for (const scale of pointCrawlConfig.scales) {
      const output = generatePointCrawlLocal({
        genre: "Sci-Fi / Space Opera",
        scale,
        pointCount: 7,
      });
      expect(output.pointCrawl?.scale).toBe(scale);
      expect(output.content).toContain(`**Scale**: ${scale}`);
      expect(output.lore).toContain("## GM Navigation & Key-Lock Reference");
    }
  });

  it("detects and deterministically repairs disconnected nodes, missing loops, key-behind-lock softlocks, overlapping sibling routes, and vague gate facts", () => {
    const base = buildPointCrawlTopology({
      genre: "Classic Fantasy",
      scale: "Dungeon",
      pointCount: 6,
    });

    // Introduce intentional playability flaws:
    // 1. Vague gate requirement + key placed behind its own gated route
    // 2. Duplicate sibling route text
    // 3. Vague clue text on a node
    const broken: PointCrawlNetwork = {
      ...base,
      nodes: base.nodes.map((n, i) =>
        i === 2 ? { ...n, clueOrReward: "the secret key" } : n,
      ),
      routes: base.routes.map((r, i) => {
        if (i === 0) {
          return {
            ...r,
            terrain: "Identical damp corridor",
            risk: "Identical patrol guard",
            signpost: "Identical torch smoke",
          };
        }
        if (i === 1) {
          return {
            ...r,
            fromNodeId: base.routes[0].fromNodeId,
            terrain: "Identical damp corridor",
            risk: "Identical patrol guard",
            signpost: "Identical torch smoke",
          };
        }
        if (r.gate) {
          return {
            ...r,
            gate: {
              kind: "key",
              unlockedByNodeId: r.toNodeId, // softlock: key at destination!
              requirement: "the correct password", // vague!
            },
          };
        }
        return r;
      }),
    };

    expect(isVaguePointCrawlFact("the correct password")).toBe(true);
    expect(isVaguePointCrawlFact("the Stamped Bronze Sluice-Key")).toBe(false);

    const beforeIssues = checkPointCrawlPlayability(broken);
    expect(beforeIssues.length).toBeGreaterThan(0);

    const repaired = repairPointCrawlPlayability(broken);
    const afterIssues = checkPointCrawlPlayability(repaired);
    expect(afterIssues).toEqual([]);
  });

  it("computes deterministic 2D SVG diagram layout and respects node drag overrides", () => {
    const crawl = generatePointCrawlNetworkLocal({ pointCount: 8 });
    const layout1 = buildPointCrawlDiagramLayout(crawl);
    const layout2 = buildPointCrawlDiagramLayout(crawl);

    expect(layout1).toEqual(layout2);
    expect(layout1.nodes).toHaveLength(8);
    expect(layout1.edges).toHaveLength(crawl.routes.length);

    const overridden = buildPointCrawlDiagramLayout(crawl, {
      "node-1": { x: 140, y: 210 },
    });
    const node1 = overridden.nodes.find((n) => n.id === "node-1");
    expect(node1?.x).toBe(140);
    expect(node1?.y).toBe(210);
  });

  it("does not label a bypassable obstacle as a chokepoint", () => {
    const crawl = buildPointCrawlTopology({
      pointCount: 6,
      density: "Highly interconnected",
    });
    const obstacle = crawl.nodes.find((node) => node.role === "obstacle");
    if (obstacle) expect(obstacle.structuralRole).not.toBe("chokepoint");
  });

  it("detects and repairs structural labels that no longer match the graph", () => {
    const crawl = buildPointCrawlTopology({ pointCount: 6 });
    const target = crawl.nodes.find(
      (node) =>
        node.structuralRole !== "start" && node.structuralRole !== "goal",
    )!;
    const stale = {
      ...crawl,
      nodes: crawl.nodes.map((node) =>
        node.id === target.id
          ? { ...node, structuralRole: "chokepoint" as const }
          : node,
      ),
    };
    expect(
      checkPointCrawlPlayability(stale).some(
        (issue) =>
          issue.code === "structural-role-mismatch" &&
          issue.nodeId === target.id,
      ),
    ).toBe(true);
    expect(
      repairPointCrawlPlayability(stale).nodes.find(
        (node) => node.id === target.id,
      )?.structuralRole,
    ).toBe(target.structuralRole);
  });

  it("preserves named plan discoveries through normalization and repair", () => {
    const crawl = buildPointCrawlTopology({ pointCount: 6 });
    const gate = crawl.routes.find((route) => route.gate)!;
    const discoveryId = `discovery-${gate.id}`;
    const named = {
      ...crawl,
      adventurePlan: {
        ...crawl.adventurePlan!,
        discoveries: crawl.adventurePlan!.discoveries.map((discovery) =>
          discovery.id === discoveryId
            ? { ...discovery, name: "The Warden's True Name" }
            : discovery,
        ),
      },
    };
    expect(
      repairPointCrawlPlayability(named).adventurePlan?.discoveries.find(
        (entry) => entry.id === discoveryId,
      )?.name,
    ).toBe("The Warden's True Name");
  });

  it("rejects and repairs a deadline that cannot fit the route timeline", () => {
    const crawl = generatePointCrawlNetworkLocal({ pointCount: 6 });
    const impossible = {
      ...crawl,
      adventurePlan: {
        ...crawl.adventurePlan!,
        clock: {
          label: "The gates align",
          startsAt: "crawl-start" as const,
          budget: { value: 1, unit: "minute" as const },
          expiry: "The final gate seals.",
        },
      },
    };
    expect(
      checkPointCrawlPlayability(impossible).some(
        (issue) => issue.code === "invalid-adventure-plan",
      ),
    ).toBe(true);
    expect(
      repairPointCrawlPlayability(impossible).adventurePlan?.clock,
    ).toBeUndefined();
  });

  it("renders markdown and GM sheets that deterministically reflect structured nodes and routes", () => {
    const crawl = generatePointCrawlNetworkLocal({
      genre: "Cosmic Horror",
      scale: "City",
      pointCount: 6,
    });
    const md = renderPointCrawlMarkdown(crawl);
    const gm = renderPointCrawlGmSheet(crawl);

    for (const node of crawl.nodes) {
      expect(md).toContain(node.name);
    }
    expect(gm).toContain("Locks, Gates & Where Keys Are Found");
    const gated = crawl.routes.find((r) => Boolean(r.gate));
    expect(gated).toBeDefined();
    expect(formatRouteConnectionLabel(gated!)).toContain(
      `Locked: ${gated!.gate!.requirement}`,
    );
    expect(md).toContain(
      `**Sights & Atmosphere:** ${crawl.nodes[0].sensoryDescription}`,
    );
    const sample = crawl.routes[0];
    const names = new Map(crawl.nodes.map((node) => [node.id, node]));
    const formatted = renderPointCrawlRouteSummary(sample, names);
    expect(
      renderPointCrawlRouteSummary(
        { ...sample, direction: "bidirectional" },
        names,
      ),
    ).toContain(" ⇄ ");
    expect(
      renderPointCrawlRouteSummary({ ...sample, direction: "one-way" }, names),
    ).toContain(" → ");
    expect(md).toContain(`(${pointCrawlNodeRoleSymbol(crawl.nodes[0])} `);
    expect(formatted).toContain("### ");
    expect(formatted).toContain(`**Travel:** ${sample.travelTime}`);
    expect(formatted).toContain(`**Terrain:** ${sample.terrain}`);
    expect(formatted).toContain(`**Risk:** ${sample.risk}`);
    expect(formatted).toContain(
      `**Signpost from ${names.get(sample.fromNodeId)?.name ?? sample.fromNodeId}:** ${sample.approachFromSource ?? sample.signpost}`,
    );
    const reverse = renderPointCrawlRouteSummary(
      { ...sample, approachFromTarget: "Return trail" },
      names,
      sample.toNodeId,
    );
    expect(reverse).toContain(
      `**Signpost from ${names.get(sample.toNodeId)?.name ?? sample.toNodeId}:** Return trail`,
    );
    const unlocked = renderPointCrawlRouteSummary(
      { ...sample, gate: undefined },
      names,
    );
    expect(unlocked).not.toContain("**Locked (");
    const routeSection = md.split("## Route Network & Trade-Offs")[1] ?? "";
    const nodesById = new Map(crawl.nodes.map((node) => [node.id, node]));
    for (const route of crawl.routes) {
      const summary = renderPointCrawlRouteSummary(route, nodesById);
      expect(routeSection.split(summary)).toHaveLength(2);
    }
  });
});

describe("Staged AI Point Crawl Generation & Fallbacks (T020)", () => {
  it("runs all 3 stages with live progress callbacks and repairs AI output", async () => {
    const progressHistory: OneShotProgressStep[][] = [];
    const detailPrompts: string[] = [];
    const topologyPrompts: string[] = [];
    const crawl = await generatePointCrawlStaged(
      {
        genre: "Sci-Fi / Space Opera",
        scale: "Planet / System",
        pointCount: 6,
        density: "Balanced branching",
      },
      async (prompt) => {
        if (prompt.includes("overarching premise")) {
          topologyPrompts.push(prompt);
          return JSON.stringify({
            title: "The Vesper Drift Blockade",
            premise:
              "A salvage flotilla must slip past orbital pickets to reach the Core-Command Dyson Node.",
            nodes: [
              {
                id: "node-1",
                name: "Relay Anchor-01",
                summary:
                  "Decommissioned comms buoy serving as the entry jump-point.",
              },
            ],
          });
        }
        detailPrompts.push(prompt);
        return JSON.stringify({
          nodes: [
            {
              id: "node-1",
              sensoryDescription:
                "Static hiss on open channels and blue thruster frost.",
              whyVisit: "Safe anchorage outside customs radar.",
              encounterOrHazard: "Drifting minefield tender.",
              clueOrReward:
                "Flight recorder holding Docking Override Cypher 'KESTREL-9'.",
            },
          ],
          routes: [
            {
              id: "route-1",
              travelTime: "6 hrs",
              terrain: "High-radiation dust-ring corridor",
              risk: "Automated customs picket scans transponders",
              signpost: "Repeating distress telemetry on naval band",
            },
          ],
        });
      },
      (steps) => progressHistory.push(steps),
    );

    expect(crawl.title).toBe("The Vesper Drift Blockade");
    expect(progressHistory.length).toBeGreaterThanOrEqual(4);
    const finalSteps = progressHistory[progressHistory.length - 1];
    expect(
      finalSteps.every((s) => s.status === "done" || s.status === "fallback"),
    ).toBe(true);
    expect(checkPointCrawlPlayability(crawl)).toEqual([]);
    expect(topologyPrompts[0]).toContain("Optional creative variation:");
    expect(detailPrompts.length).toBeGreaterThan(1);
    expect(
      detailPrompts.every(
        (prompt) => !prompt.includes("Optional creative variation:"),
      ),
    ).toBe(true);
    const plans = detailPrompts.map(
      (prompt) =>
        prompt.match(
          /Shared adventure plan \(use as immutable context; do not invent new mandatory dependencies\):\n([\s\S]*?)\nLocations to detail:/,
        )?.[1],
    );
    expect(new Set(plans).size).toBe(1);
    expect(
      crawl.routes.find((route) => route.id === "route-1")?.travelTime,
    ).not.toBe("6 hrs");
  });

  it("handles partial batch failure via fillFailedPointCrawlParts without losing completed batches", async () => {
    let callNum = 0;
    const crawl = await generatePointCrawlStaged(
      {
        genre: "Classic Fantasy",
        scale: "Dungeon",
        pointCount: 8,
      },
      async () => {
        callNum++;
        // Stage 1 succeeds; first batch of Stage 2 fails; second batch succeeds
        if (callNum === 1) {
          return JSON.stringify({
            title: "The Sunken Reliquary",
            premise: "Delve into the flooded vaults.",
            nodes: [],
          });
        }
        if (callNum === 2 || callNum === 3) {
          throw new Error("Simulated batch timeout");
        }
        return JSON.stringify({ nodes: [], routes: [] });
      },
    );

    expect(crawl.title).toBe("The Sunken Reliquary");
    expect(crawl.nodes).toHaveLength(8);
    expect(crawl.gaps && crawl.gaps.length).toBeGreaterThan(0);
    expect(checkPointCrawlPlayability(crawl)).toEqual([]);
  });

  it("respects AbortSignal cancellation during staged generation", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      generatePointCrawlStaged(
        { pointCount: 6 },
        async () => "{}",
        undefined,
        controller.signal,
      ),
    ).rejects.toThrow();
  });

  it("parses full AI JSON responses and normalizes malformed topology in parsePointCrawlResponse", () => {
    const prompt = buildPointCrawlPrompt({
      genre: "Dark Fantasy",
      scale: "Region",
      pointCount: 6,
    });
    const parsed = parsePointCrawlResponse(
      JSON.stringify({
        title: "Ashen March",
        premise: "Cross the blighted borderlands.",
        nodes: [
          {
            id: "node-1",
            name: "Borderland Post",
            role: "start",
            summary: "Last garrison.",
          },
        ],
        routes: [],
      }),
      prompt.resolved,
    );
    expect(parsed.title).toBe("Ashen March");
    expect(parsed.pointCrawl?.nodes).toHaveLength(6);
    expect(checkPointCrawlPlayability(parsed.pointCrawl!)).toEqual([]);
  });
});

describe("Surgical Single-Node & Single-Route Regeneration (T020)", () => {
  it("regenerates a single node locally and via AI while preserving topology and unlocksRouteIds", async () => {
    const crawl = generatePointCrawlNetworkLocal({
      genre: "Classic Fantasy",
      scale: "Dungeon",
      pointCount: 7,
    });
    const keyHolder =
      crawl.nodes.find((n) => n.unlocksRouteIds.length > 0) ?? crawl.nodes[1];
    const originalUnlocks = [...keyHolder.unlocksRouteIds];

    const localResult = regeneratePointCrawlPartLocal(
      crawl,
      { kind: "node", id: keyHolder.id },
      "Flooded with alchemicalmercury",
    );
    const updatedLocalNode = localResult.crawl.nodes.find(
      (n) => n.id === keyHolder.id,
    )!;
    expect(updatedLocalNode.unlocksRouteIds).toEqual(originalUnlocks);
    expect(updatedLocalNode.summary).toContain(
      "Flooded with alchemicalmercury",
    );
    expect(checkPointCrawlPlayability(localResult.crawl)).toEqual([]);

    const aiResult = await regeneratePointCrawlPart(
      crawl,
      { kind: "node", id: keyHolder.id },
      {
        useAI: true,
        instruction: "Make it an ancient clockwork foundry",
        complete: async () =>
          JSON.stringify({
            name: "The Clockwork Foundry",
            summary: "Whirring brass gears above a molten slag channel.",
            sensoryDescription: "Ozone, hot oil, and rhythmic hammer-strikes.",
            whyVisit: "Controls the sluice pressure for the lower level.",
            encounterOrHazard: "Automaton stokers guarding the crucible.",
            clueOrReward:
              "Stamped Bronze Sluice-Key hanging from the foreman's lectern.",
          }),
      },
    );
    const updatedAiNode = aiResult.crawl.nodes.find(
      (n) => n.id === keyHolder.id,
    )!;
    expect(updatedAiNode.name).toBe("The Clockwork Foundry");
    expect(updatedAiNode.unlocksRouteIds).toEqual(originalUnlocks);
    expect(aiResult.crawl.adventurePlan).toEqual(crawl.adventurePlan);
    expect(checkPointCrawlPlayability(aiResult.crawl)).toEqual([]);
  });

  it("regenerates a single route while keeping endpoints and gate structure intact", async () => {
    const crawl = generatePointCrawlNetworkLocal({
      genre: "Sci-Fi / Space Opera",
      scale: "Planet / System",
      pointCount: 6,
    });
    const targetRoute = crawl.routes[0];

    const result = await regeneratePointCrawlPart(
      crawl,
      { kind: "route", id: targetRoute.id },
      {
        useAI: true,
        instruction: "Add a pirate blockade",
        complete: async () =>
          JSON.stringify({
            travelTime: "14 hrs",
            terrain: "Shattered ice-moon ring",
            risk: "Corsair corvette 'Red Jackal' demands a fuel tithe",
            signpost: "Ionized hull debris drifting across the lane",
          }),
      },
    );

    const updated = result.crawl.routes.find((r) => r.id === targetRoute.id)!;
    expect(updated.fromNodeId).toBe(targetRoute.fromNodeId);
    expect(updated.toNodeId).toBe(targetRoute.toNodeId);
    expect(updated.direction).toBe(targetRoute.direction);
    expect(updated.visibility).toBe(targetRoute.visibility);
    expect(updated.gate).toEqual(targetRoute.gate);
    expect(updated.travelTime).toBe(targetRoute.travelTime);
    expect(updated.duration).toEqual(targetRoute.duration);
    expect(updated.terrain).toBe("Shattered ice-moon ring");
    expect(updated.risk).toContain("Red Jackal");
  });
});

describe("Multi-Entity Vault Save Draft Builder (T024)", () => {
  it("builds N Location drafts + 1 master overview Note draft (placed last) with ## Routes & Exits and route connection labels", () => {
    const crawl = generatePointCrawlNetworkLocal({
      genre: "Classic Fantasy",
      scale: "Wilderness",
      pointCount: 6,
    });

    const drafts = buildPointCrawlSaveDrafts(crawl, {
      mapImageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
    });

    // 6 Locations + 1 Master Note = 7 drafts
    expect(drafts).toHaveLength(7);
    const locationDrafts = drafts.slice(0, 6);
    const masterNote = drafts[6];

    for (const loc of locationDrafts) {
      expect(loc.type).toBe("location");
      expect(loc.lore).toContain("## Routes & Exits");
      for (const rel of loc.relationships) {
        expect(rel.type).toBe("route");
        expect(rel.label).toContain("·");
      }
    }

    const route = crawl.routes[0];
    const sourceDraft = locationDrafts.find(
      (draft) => draft.sourceNodeId === route.fromNodeId,
    )!;
    expect(sourceDraft.lore).toContain(`**Terrain:** ${route.terrain}`);
    expect(sourceDraft.lore).toContain(`**Risk:** ${route.risk}`);
    expect(masterNote.content).toContain(`**Terrain:** ${route.terrain}`);
    const gated = crawl.routes.find((entry) => entry.gate)!;
    expect(masterNote.content).toContain(`**Locked (${gated.gate!.kind}):**`);
    expect(masterNote.content).toContain(gated.gate!.requirement);

    expect(masterNote.type).toBe("note");
    expect(masterNote.kind).toBe("point-crawl");
    expect(masterNote.mapImageDataUrl).toBe(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
    );
    expect(masterNote.relationships).toHaveLength(6);
    expect(masterNote.relationships.every((r) => r.type === "contains")).toBe(
      true,
    );
  });

  it("filters routes and relationships cleanly when saving a subset of selectedNodeIds", () => {
    const crawl = generatePointCrawlNetworkLocal({
      genre: "Classic Fantasy",
      scale: "Dungeon",
      pointCount: 8,
    });
    const subsetIds = crawl.nodes.slice(0, 3).map((n) => n.id);
    const subsetTitles = new Set(crawl.nodes.slice(0, 3).map((n) => n.name));

    const drafts = buildPointCrawlSaveDrafts(crawl, {
      selectedNodeIds: subsetIds,
    });

    expect(drafts).toHaveLength(4); // 3 Locations + 1 Master Note
    const masterNote = drafts[3];
    expect(masterNote.relationships).toHaveLength(3);

    // No location draft may have a relationship to a deselected node
    for (const loc of drafts.slice(0, 3)) {
      for (const rel of loc.relationships) {
        expect(subsetTitles.has(rel.title)).toBe(true);
      }
    }
  });

  it("handles fillFailedPointCrawlParts and reachableNodesBfs edge cases", () => {
    const crawl = generatePointCrawlNetworkLocal({ pointCount: 6 });
    const filled = fillFailedPointCrawlParts(crawl, new Map(), new Map());
    expect(filled.gaps?.length).toBe(crawl.nodes.length + crawl.routes.length);
    expect(filled.nodes.every((n) => n.fromFallback)).toBe(true);

    const resolved = resolvePointCrawl({ pointCount: 99 });
    expect(resolved.pointCount).toBe(15);

    const normalized = normalizePointCrawlTopology({
      ...crawl,
      nodes: crawl.nodes.map((n) => ({ ...n, role: "side" })),
      routes: [],
    });
    expect(
      reachableNodesBfs(normalized.startNodeId, normalized.routes).size,
    ).toBe(6);
  });

  it("keeps the public one-shot parser bound to its mechanical skeleton", () => {
    const resolved = resolvePointCrawl({
      pointCount: 6,
      density: "Balanced branching",
      scale: "Wilderness",
    });
    const rng = () => 0.37;
    const base = generatePointCrawlNetworkLocal(resolved, rng);
    const changed = parsePointCrawlNetwork(
      JSON.stringify({
        nodes: base.nodes.map((node) => ({
          ...node,
          layer: 99,
          rail: 99,
          unlocksRouteIds: ["invented-route"],
        })),
        routes: base.routes.map((route) => ({
          ...route,
          fromNodeId: route.toNodeId,
          toNodeId: route.fromNodeId,
          direction: "one-way",
          visibility: "obvious",
          travelTime: "99 days",
          gate: {
            kind: "seal",
            unlockedByNodeId: "node-99",
            requirement: "invented key",
          },
          isLoopOrShortcut: false,
          terrain: "rewritten terrain",
        })),
      }),
      resolved,
      rng,
    );

    expect(
      changed.nodes.map(({ id, layer, rail, unlocksRouteIds }) => ({
        id,
        layer,
        rail,
        unlocksRouteIds,
      })),
    ).toEqual(
      base.nodes.map(({ id, layer, rail, unlocksRouteIds }) => ({
        id,
        layer,
        rail,
        unlocksRouteIds,
      })),
    );
    expect(
      changed.routes.map(
        ({
          id,
          fromNodeId,
          toNodeId,
          direction,
          visibility,
          travelTime,
          gate,
          isLoopOrShortcut,
        }) => ({
          id,
          fromNodeId,
          toNodeId,
          direction,
          visibility,
          travelTime,
          gate,
          isLoopOrShortcut,
        }),
      ),
    ).toEqual(
      base.routes.map(
        ({
          id,
          fromNodeId,
          toNodeId,
          direction,
          visibility,
          travelTime,
          gate,
          isLoopOrShortcut,
        }) => ({
          id,
          fromNodeId,
          toNodeId,
          direction,
          visibility,
          travelTime,
          gate,
          isLoopOrShortcut,
        }),
      ),
    );
    expect(
      changed.routes.every((route) => route.terrain === "rewritten terrain"),
    ).toBe(true);
  });
});
