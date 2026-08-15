import { DiceEngine, diceEngine as defaultDice } from "dice-engine";
import type {
  RandomSource,
  ResolutionContext,
  ResolutionNode,
  RollOutcome,
  TableEntry,
} from "./types";
import { MAX_RESOLUTION_DEPTH } from "./types";
import { rollRaw, selectIndex, weightsOf } from "./selection";
import { parseReferences } from "./resolver";

/**
 * Rolling and resolution.
 *
 * Every method is total: cycles, depth exhaustion, and missing targets are
 * carried as `ResolutionNode.status` plus a user-facing notice rather than
 * thrown, so a roll always yields something usable (FR-014/015/016).
 */
export class RandomSourceEngine {
  constructor(
    private dice: DiceEngine = defaultDice,
    private maxDepth: number = MAX_RESOLUTION_DEPTH,
  ) {}

  /** Rolls one source and returns a single composed result. */
  roll(source: RandomSource, ctx: ResolutionContext): RollOutcome {
    const outcome: RollOutcome = { finalText: "", chain: [], notices: [] };
    const node = this.rollSource(source, ctx, outcome, new Set(), 0);
    outcome.chain = [node];
    outcome.finalText = node.text;
    return outcome;
  }

  /** Rolls several sources as one action, presented as one outcome (FR-017). */
  rollMany(sources: RandomSource[], ctx: ResolutionContext): RollOutcome {
    const outcome: RollOutcome = { finalText: "", chain: [], notices: [] };
    for (const source of sources) {
      outcome.chain.push(this.rollSource(source, ctx, outcome, new Set(), 0));
    }
    outcome.finalText = outcome.chain.map((n) => n.text).join("\n");
    return outcome;
  }

  /**
   * Selects one entry, then resolves any references inside its text.
   *
   * `visiting` is the set of source names on the current resolution path — a
   * visited set rather than a depth counter alone, because a cycle and honest
   * deep nesting are different failures and need different messages (R8).
   */
  private rollSource(
    source: RandomSource,
    ctx: ResolutionContext,
    outcome: RollOutcome,
    visiting: Set<string>,
    depth: number,
  ): ResolutionNode {
    const node: ResolutionNode = {
      sourceName: source.name,
      sourceKind: source.kind,
      text: "",
      children: [],
      status: "ok",
    };

    const picked = this.pick(source, node);
    if (picked === undefined) {
      node.status = "unresolved";
      outcome.notices.push({
        kind: "unresolved",
        sourceName: source.name,
        message: describeNothingToPick(source),
      });
      return node;
    }

    node.template = picked;
    node.text = this.resolveText(
      picked,
      ctx,
      outcome,
      node,
      new Set([...visiting, key(source.name)]),
      depth,
    );
    return node;
  }

  /** Chooses one entry's text, recording the die value that produced it. */
  private pick(source: RandomSource, node: ResolutionNode): string | undefined {
    if (source.kind === "deck") {
      const cards = source.cards ?? [];
      if (cards.length === 0) return undefined;
      // A deck reached this way is sampled *with replacement* and never
      // depleted — only an explicit draw touches DeckState (FR-012a).
      const { index } = selectIndex(
        cards.map(() => 1),
        this.dice,
      );
      return cards[index].body || cards[index].title;
    }

    const entries = source.entries ?? [];
    if (entries.length === 0) return undefined;

    if (source.selection?.mode === "ranged") {
      const sides = source.selection.die.sides;
      const value = rollRaw(sides, this.dice);
      node.dieValue = value;
      const hit = entries.find(
        (e) => e.range && value >= e.range.min && value <= e.range.max,
      );
      // A gap in coverage is a validation warning, not a roll failure: fall
      // back to the nearest entry rather than returning nothing.
      return (hit ?? nearest(entries, value)).text;
    }

    const weights = weightsOf(entries);
    // Every weight zeroed is a table mid-edit, not a crash. Selection would
    // throw on a non-positive total, and this method's callers treat a missing
    // pick as a notice, which is the right outcome for both.
    if (weights.reduce((a, b) => a + b, 0) <= 0) return undefined;

    const { index, roll } = selectIndex(weights, this.dice);
    node.dieValue = roll;
    return entries[index].text;
  }

  /** Substitutes every `{reference}` in `text`, depth- and cycle-guarded. */
  private resolveText(
    text: string,
    ctx: ResolutionContext,
    outcome: RollOutcome,
    parent: ResolutionNode,
    visiting: Set<string>,
    depth: number,
  ): string {
    const refs = parseReferences(text);
    if (refs.length === 0) return text;

    let result = "";
    let cursor = 0;

    for (const ref of refs) {
      result += text.slice(cursor, ref.start);
      cursor = ref.end;

      const target = ctx.lookup(ref.name);

      if (!target) {
        // Preserve the token verbatim so the user can see what broke.
        result += ref.raw;
        parent.children.push({
          sourceName: ref.name,
          sourceKind: "table",
          text: ref.raw,
          children: [],
          status: "unresolved",
        });
        outcome.notices.push({
          kind: "unresolved",
          sourceName: ref.name,
          message: `${ref.raw} does not match any table or deck, so it was left as-is.`,
        });
        continue;
      }

      if (visiting.has(key(target.name))) {
        result += ref.raw;
        parent.children.push({
          sourceName: target.name,
          sourceKind: target.kind,
          text: ref.raw,
          children: [],
          status: "cycle",
        });
        outcome.notices.push({
          kind: "cycle",
          sourceName: target.name,
          message: `"${target.name}" refers back to itself, so the reference loop was cut short.`,
        });
        continue;
      }

      if (depth + 1 >= this.maxDepth) {
        result += ref.raw;
        parent.children.push({
          sourceName: target.name,
          sourceKind: target.kind,
          text: ref.raw,
          children: [],
          status: "depth-limit",
        });
        outcome.notices.push({
          kind: "depth-limit",
          sourceName: target.name,
          message: `Resolution stopped at the nesting limit of ${this.maxDepth} while expanding "${target.name}".`,
        });
        continue;
      }

      const child = this.rollSource(target, ctx, outcome, visiting, depth + 1);
      parent.children.push(child);
      result += child.text;
    }

    result += text.slice(cursor);
    return result;
  }

  /**
   * Re-resolves one node of a prior outcome, leaving its siblings intact
   * (FR-019). `nodePath` indexes into `chain`, then into `children`.
   */
  rerollFragment(
    outcome: RollOutcome,
    nodePath: number[],
    ctx: ResolutionContext,
  ): RollOutcome {
    if (nodePath.length === 0) return outcome;

    const next: RollOutcome = {
      finalText: "",
      chain: structuredClone(outcome.chain),
      notices: [],
    };

    // Walk to the parent of the target node, collecting the names on the way.
    // The ancestors have to travel with the re-roll: starting from an empty set
    // would let a fragment expand back into a source already on its own path,
    // reporting the depth limit for what is really a cycle — and those two are
    // told apart deliberately (R8).
    let parentChildren = next.chain;
    const ancestors = new Set<string>();
    for (const index of nodePath.slice(0, -1)) {
      const step = parentChildren[index];
      if (!step) return outcome;
      ancestors.add(key(step.sourceName));
      parentChildren = step.children;
    }

    const targetIndex = nodePath[nodePath.length - 1];
    const target = parentChildren[targetIndex];
    if (!target) return outcome;

    const source = ctx.lookup(target.sourceName);
    if (!source) return outcome;

    parentChildren[targetIndex] = this.rollSource(
      source,
      ctx,
      next,
      ancestors,
      nodePath.length - 1,
    );

    next.finalText = next.chain.map(renderNode).join("\n");
    return next;
  }
}

/**
 * Rebuilds a node's text from its children, so a re-rolled fragment shows up in
 * the composed result rather than only in the chain.
 *
 * Children are pushed in reference order during resolution, so interleaving
 * them back into the template's reference slots reproduces the original
 * composition with the new fragment substituted.
 */
function renderNode(node: ResolutionNode): string {
  const template = node.template;
  if (!template || node.children.length === 0) return node.text;

  const refs = parseReferences(template);
  if (refs.length === 0) return template;

  let result = "";
  let cursor = 0;
  refs.forEach((ref, i) => {
    result += template.slice(cursor, ref.start);
    const child = node.children[i];
    result += child ? renderNode(child) : ref.raw;
    cursor = ref.end;
  });
  return result + template.slice(cursor);
}

function key(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Why a source yielded nothing.
 *
 * A table with entries that all weigh nothing is a different problem from a
 * table with no entries, and telling a user "this has no entries to roll" while
 * they are looking at a screen full of entries is worse than saying nothing.
 */
function describeNothingToPick(source: RandomSource): string {
  if (source.kind === "deck") return `"${source.name}" has no cards to draw.`;
  const entries = source.entries ?? [];
  if (entries.length === 0) return `"${source.name}" has no entries to roll.`;
  return `Every entry in "${source.name}" has a weight of 0, so there is nothing to pick.`;
}

/** Closest entry by range midpoint, used when coverage has a gap. */
function nearest(entries: TableEntry[], value: number): TableEntry {
  let best = entries[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    if (!entry.range) continue;
    const distance =
      value < entry.range.min
        ? entry.range.min - value
        : value > entry.range.max
          ? value - entry.range.max
          : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }
  return best;
}

/** Default singleton alongside the class (Constitution VIII). */
export const randomSourceEngine = new RandomSourceEngine();
