import { describe, expect, it } from "vitest";
import {
  dominatesAllGoals,
  fastestPlayableTravelTime,
  formatPointCrawlDuration,
  isNodeOptional,
  parsePointCrawlDuration,
  pointCrawlRouteBudget,
  pointCrawlStructuralRole,
  routesIncidentTo,
  usableRouteDegree,
} from "./point-crawl-graph-analysis";
import type {
  PointCrawlNetwork,
  PointCrawlNode,
  PointCrawlRoute,
} from "./point-crawl-state";

const route = (
  id: string,
  fromNodeId: string,
  toNodeId: string,
  direction: PointCrawlRoute["direction"] = "bidirectional",
): PointCrawlRoute => ({
  id,
  fromNodeId,
  toNodeId,
  direction,
  visibility: "obvious",
  travelTime: "1 hr",
  terrain: "road",
  risk: "none",
  signpost: "sign",
});

const node = (id: string): PointCrawlNode =>
  ({ id, role: "side" }) as PointCrawlNode;

describe("point crawl graph analysis", () => {
  it("sets progressively larger route budgets", () => {
    expect(pointCrawlRouteBudget(8, "Linear-leaning")).toBe(9);
    expect(pointCrawlRouteBudget(8, "Balanced branching")).toBe(11);
    expect(pointCrawlRouteBudget(8, "Highly interconnected")).toBe(14);
    expect(pointCrawlRouteBudget(15, "Highly interconnected")).toBe(24);
  });

  it("parses, formats and compares compatible travel units", () => {
    expect(parsePointCrawlDuration("90 minutes")).toEqual({
      value: 90,
      unit: "minute",
    });
    expect(formatPointCrawlDuration({ value: 2, unit: "hour" })).toBe("2 hrs");
    expect(parsePointCrawlDuration("soon")).toBeNull();
  });

  it("includes the time needed to acquire a key before using a gated route", () => {
    const keyRoute = {
      ...route("key", "start", "key-node"),
      travelTime: "2 hrs",
      duration: { value: 2, unit: "hour" as const },
    };
    const gated = {
      ...route("lock", "key-node", "goal"),
      travelTime: "3 hrs",
      duration: { value: 3, unit: "hour" as const },
      gate: {
        kind: "key" as const,
        unlockedByNodeId: "key-node",
        requirement: "brass key",
      },
    };
    const crawl = {
      startNodeId: "start",
      goalNodeIds: ["goal"],
      routes: [keyRoute, gated],
    } as PointCrawlNetwork;
    expect(fastestPlayableTravelTime(crawl, "start", "hour")).toBe(5);
    expect(fastestPlayableTravelTime(crawl, "start", "day")).toBeCloseTo(
      5 / 24,
    );
  });

  it("counts bidirectional approaches at both endpoints and one-way only at origin", () => {
    const routes = [
      route("a", "start", "hub"),
      route("b", "hub", "goal", "one-way"),
    ];
    expect(routesIncidentTo("hub", routes)).toHaveLength(2);
    expect(usableRouteDegree("start", routes)).toBe(1);
    expect(usableRouteDegree("goal", routes)).toBe(0);
  });

  it("distinguishes goal chokepoints from optional nodes", () => {
    const nodes = ["start", "gate", "goal", "side"].map(node);
    const crawl = {
      startNodeId: "start",
      goalNodeIds: ["goal"],
      nodes,
      routes: [
        route("1", "start", "gate"),
        route("2", "gate", "goal"),
        route("3", "start", "side"),
      ],
    } as PointCrawlNetwork;
    expect(dominatesAllGoals(crawl, "gate")).toBe(true);
    expect(isNodeOptional(crawl, "side")).toBe(true);
    expect(dominatesAllGoals(crawl, "side")).toBe(false);
    expect(pointCrawlStructuralRole(nodes[3], crawl)).toBe("optional");
  });

  it("does not call a bypassable node a chokepoint", () => {
    const nodes = ["start", "gate", "goal"].map((id) => ({
      id,
    })) as PointCrawlNetwork["nodes"];
    const crawl = {
      startNodeId: "start",
      goalNodeIds: ["goal"],
      nodes,
      routes: [
        route("1", "start", "gate"),
        route("2", "gate", "goal"),
        route("3", "start", "goal"),
      ],
    } as PointCrawlNetwork;
    expect(dominatesAllGoals(crawl, "gate")).toBe(false);
  });

  it("classifies hubs through reversed bidirectional edges and requires hidden access for secrets", () => {
    const hub = node("hub");
    const start = node("start");
    const goal = node("goal");
    const side = node("side");
    const hubNetwork = {
      startNodeId: start.id,
      goalNodeIds: [goal.id],
      nodes: [start, hub, goal, side],
      routes: [
        route("reverse", hub.id, start.id),
        route("goal", hub.id, goal.id),
        route("side", hub.id, side.id),
        route("bypass", start.id, goal.id),
      ],
    } as PointCrawlNetwork;
    expect(pointCrawlStructuralRole(hub, hubNetwork)).toBe("hub");

    const secret = node("secret");
    const secretNetwork = {
      startNodeId: start.id,
      goalNodeIds: [goal.id],
      nodes: [start, secret, goal],
      routes: [
        { ...route("in", start.id, secret.id), visibility: "hidden" },
        { ...route("out", secret.id, goal.id), visibility: "rumoured" },
        route("bypass", start.id, goal.id),
      ],
    } as PointCrawlNetwork;
    expect(pointCrawlStructuralRole(secret, secretNetwork)).toBe("secret");
    expect(
      pointCrawlStructuralRole(secret, {
        ...secretNetwork,
        routes: [
          ...secretNetwork.routes,
          route("obvious", start.id, secret.id),
        ],
      }),
    ).not.toBe("secret");
  });

  it("recognises a node that dominates one goal when another goal remains accessible", () => {
    const nodes = ["start", "junction", "goal-a", "goal-b"].map(node);
    const crawl = {
      startNodeId: "start",
      goalNodeIds: ["goal-a", "goal-b"],
      nodes,
      routes: [
        route("1", "start", "junction"),
        route("2", "junction", "goal-a"),
        route("3", "start", "goal-b"),
      ],
    } as PointCrawlNetwork;
    expect(dominatesAllGoals(crawl, "junction")).toBe(true);
    expect(pointCrawlStructuralRole(node("junction"), crawl)).toBe(
      "chokepoint",
    );
  });

  it("labels a bypassable pass-through location as a connector", () => {
    const start = node("start");
    const connector = { ...node("connector"), role: "obstacle" as const };
    const branch = node("branch");
    const goal = node("goal");
    const crawl = {
      startNodeId: start.id,
      goalNodeIds: [goal.id],
      nodes: [start, connector, branch, goal],
      routes: [
        route("1", start.id, connector.id),
        route("2", connector.id, branch.id),
        route("3", start.id, goal.id),
      ],
    } as PointCrawlNetwork;
    expect(pointCrawlStructuralRole(connector, crawl)).toBe("connector");
  });
});
