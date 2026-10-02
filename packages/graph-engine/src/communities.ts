/**
 * Groups densely linked entities into communities by label propagation: each
 * node repeatedly adopts the label most common among its neighbours until no
 * label changes. Deterministic for a given graph (stable order, smallest label
 * wins ties), so the layout and the community backgrounds always agree.
 *
 * Unconnected nodes keep their own id as label, i.e. a community of one.
 */
export function detectCommunities(
  nodeIds: readonly string[],
  edges: ReadonlyArray<readonly [string, string]>,
  maxRounds = 25,
): Map<string, string> {
  const ids = [...nodeIds].sort();
  const neighbours = neighbourLists(ids, edges);
  const label = new Map<string, string>(ids.map((id) => [id, id]));
  const order = ids.slice();
  for (let round = 0; round < maxRounds; round++) {
    shuffleForRound(order, round);
    let changed = false;
    for (const id of order) {
      const best = mostCommonLabel(neighbours.get(id)!, label, label.get(id)!);
      if (best !== label.get(id)) {
        label.set(id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return label;
}

function neighbourLists(
  ids: readonly string[],
  edges: ReadonlyArray<readonly [string, string]>,
): Map<string, string[]> {
  const neighbours = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [a, b] of edges) {
    if (a === b || !neighbours.has(a) || !neighbours.has(b)) continue;
    neighbours.get(a)!.push(b);
    neighbours.get(b)!.push(a);
  }
  return neighbours;
}

/**
 * A fixed pseudo-shuffle per round: visiting nodes in the same order every
 * time lets a single label flood along it.
 */
function shuffleForRound(order: string[], round: number) {
  for (let k = order.length - 1; k > 0; k--) {
    const j = (k * 7919 + round * 104729) % (k + 1);
    [order[k], order[j]] = [order[j], order[k]];
  }
}

/** The label most common among `near`, smallest on a tie; `current` when alone. */
function mostCommonLabel(
  near: readonly string[],
  label: ReadonlyMap<string, string>,
  current: string,
): string {
  if (near.length === 0) return current;
  const counts = new Map<string, number>();
  for (const n of near) {
    const l = label.get(n)!;
    counts.set(l, (counts.get(l) ?? 0) + 1);
  }
  let best = current;
  let bestCount = -1;
  for (const [l, count] of counts) {
    if (count > bestCount || (count === bestCount && l < best)) {
      best = l;
      bestCount = count;
    }
  }
  return best;
}
