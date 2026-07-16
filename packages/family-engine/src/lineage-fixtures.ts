import type { Entity } from "schema";

type Conn = { target: string; type: string; label?: string };

export function char(
  id: string,
  connections: Conn[] = [],
  extra: Partial<Entity> = {},
): Entity {
  return {
    id,
    type: "character",
    title: id.toUpperCase(),
    connections: connections.map((c) => ({ ...c, strength: 1 })),
    ...extra,
  } as unknown as Entity;
}

export function map(...entities: Entity[]): Record<string, Entity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

function link(a: string, b: string, aToB: string, bToA: string): [Conn, Conn] {
  return [
    { target: b, type: aToB },
    { target: a, type: bToA },
  ];
}

/**
 * Five generations, straight line, with a partner at every generation:
 * gg-grandparent -> grandparent -> parent -> focus -> child.
 */
export function fiveGenerationLine(): Record<string, Entity> {
  const chain = ["ggparent", "gparent", "parent", "focus", "child"];
  const partners: Record<string, string> = {
    ggparent: "ggpartner",
    gparent: "gpartner",
    parent: "ppartner",
    focus: "fpartner",
    child: "cpartner",
  };
  const conns: Record<string, Conn[]> = Object.fromEntries(
    chain.map((id) => [id, []]),
  );
  for (const partnerId of Object.values(partners)) conns[partnerId] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const [pc, cp] = link(chain[i], chain[i + 1], "parent_of", "child_of");
    conns[chain[i]].push(pc);
    conns[chain[i + 1]].push(cp);
  }
  for (const [id, partnerId] of Object.entries(partners)) {
    const [a, b] = link(id, partnerId, "spouse_of", "spouse_of");
    conns[id].push(a);
    conns[partnerId].push(b);
  }

  return map(...Object.keys(conns).map((id) => char(id, conns[id])));
}

/**
 * An ancestor ("greatx1") has children by two different partners: "parent"
 * (focus's actual parent, by partnerA) and "auntUncle" (by partnerB).
 */
export function cadetBranchDynasty(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  const add = (id: string, conns: Conn[] = []) => {
    entities[id] = char(id, conns);
  };

  add("greatx1", [
    { target: "partnerA", type: "spouse_of" },
    { target: "partnerB", type: "spouse_of" },
    { target: "parent", type: "parent_of" },
    { target: "auntUncle", type: "parent_of" },
  ]);
  add("partnerA", [{ target: "parent", type: "parent_of" }]);
  add("partnerB", [{ target: "auntUncle", type: "parent_of" }]);
  add("parent", [
    { target: "greatx1", type: "child_of" },
    { target: "partnerA", type: "child_of" },
    { target: "focus", type: "parent_of" },
  ]);
  add("auntUncle", [
    { target: "greatx1", type: "child_of" },
    { target: "partnerB", type: "child_of" },
    { target: "cousin", type: "parent_of" },
  ]);
  add("cousin", [{ target: "auntUncle", type: "child_of" }]);
  add("focus", [{ target: "parent", type: "child_of" }]);

  return entities;
}

/** A focus whose two parents are, in turn, first cousins (double reach). */
export function cousinMarriageDoubleReach(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  const add = (id: string, conns: Conn[] = []) => {
    entities[id] = char(id, conns);
  };

  add("grandparent", [
    { target: "parentA", type: "parent_of" },
    { target: "auntUncle", type: "parent_of" },
  ]);
  add("parentA", [
    { target: "grandparent", type: "child_of" },
    { target: "focus", type: "parent_of" },
  ]);
  add("auntUncle", [
    { target: "grandparent", type: "child_of" },
    { target: "parentB", type: "parent_of" },
  ]);
  // parentB (child of auntUncle, i.e. focus's parent's first cousin) marries
  // back into parentA's line as focus's other parent — a shared ancestor
  // (grandparent) reachable via two different paths from focus.
  add("parentB", [
    { target: "auntUncle", type: "child_of" },
    { target: "focus", type: "parent_of" },
  ]);
  add("focus", [
    { target: "parentA", type: "child_of" },
    { target: "parentB", type: "child_of" },
  ]);

  return entities;
}

/** A deliberate ancestry cycle: focus's own grandparent is recorded as a descendant. */
export function ancestryCycle(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  const add = (id: string, conns: Conn[] = []) => {
    entities[id] = char(id, conns);
  };

  add("focus", [
    { target: "parent", type: "child_of" },
    { target: "child", type: "parent_of" },
  ]);
  add("parent", [
    { target: "grandparent", type: "child_of" },
    { target: "focus", type: "parent_of" },
  ]);
  add("grandparent", [{ target: "parent", type: "parent_of" }]);
  add("child", [
    { target: "focus", type: "child_of" },
    // Cycle: child is recorded as a parent of grandparent.
    { target: "grandparent", type: "parent_of" },
  ]);

  return entities;
}

/** Only the parent records the link; the child records nothing (bidirectional read). */
export function oneSidedAncestorLink(): Record<string, Entity> {
  return map(
    char("parent", [{ target: "focus", type: "parent_of" }]),
    char("focus"),
  );
}

/**
 * ~200-member dynasty: a balanced binary tree of descendants from `focus`,
 * each with a partner, seven generations deep (2^7 - 1 = 127 direct members,
 * ~250 including partners) — enough to exercise SC-003.
 */
export function largeDynasty(depth = 7): Record<string, Entity> {
  const entities: Record<string, Entity> = {};
  const add = (id: string, conns: Conn[] = []) => {
    entities[id] = char(id, conns);
  };

  function build(id: string, level: number) {
    const partnerId = `${id}-p`;
    add(partnerId, [{ target: id, type: "spouse_of" }]);
    const focusConns = entities[id]?.connections ?? [];
    entities[id] = char(id, [
      ...focusConns.map((c) => ({
        target: c.target,
        type: c.type,
        label: c.label,
      })),
      { target: partnerId, type: "spouse_of" },
    ]);
    if (level >= depth) return;
    for (const suffix of ["a", "b"]) {
      const childId = `${id}${suffix}`;
      add(childId, [{ target: id, type: "child_of" }]);
      const parentEntity = entities[id];
      entities[id] = char(id, [
        ...(parentEntity.connections ?? []),
        { target: childId, type: "parent_of" },
      ]);
      build(childId, level + 1);
    }
  }

  add("focus");
  build("focus", 1);
  return entities;
}
