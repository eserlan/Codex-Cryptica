type Node = {
  next: Map<string, Node>;
  fail: Node | null;
  lengths: number[];
};

const WORD = /[\p{L}\p{N}_-]/u;

/** Builds a case-insensitive, boundary-aware matcher in O(terms) space. */
export function createBoundaryMatcher(
  terms: Iterable<string>,
): (text: string) => boolean {
  const root: Node = { next: new Map(), fail: null, lengths: [] };

  for (const rawTerm of terms) {
    const term = rawTerm.toLocaleLowerCase();
    if (!term) continue;
    let node = root;
    for (const char of term) {
      let next = node.next.get(char);
      if (!next) {
        next = { next: new Map(), fail: root, lengths: [] };
        node.next.set(char, next);
      }
      node = next;
    }
    node.lengths.push(term.length);
  }

  const queue: Node[] = [];
  for (const child of root.next.values()) {
    child.fail = root;
    queue.push(child);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]!;
    for (const [char, child] of node.next) {
      let fallback = node.fail;
      while (fallback && !fallback.next.has(char)) fallback = fallback.fail;
      child.fail = fallback?.next.get(char) ?? root;
      child.lengths.push(...child.fail.lengths);
      queue.push(child);
    }
  }

  return (rawText) => {
    const text = rawText.toLocaleLowerCase();
    let node = root;
    let index = 0;
    for (const char of text) {
      while (node !== root && !node.next.has(char)) node = node.fail ?? root;
      node = node.next.get(char) ?? root;
      for (const length of node.lengths) {
        const start = index + char.length - length;
        const end = index + char.length;
        if (isBoundary(text, start - 1) && isBoundary(text, end)) return true;
      }
      index += char.length;
    }
    return false;
  };
}

export function containsBoundaryTerm(
  text: string,
  terms: Iterable<string>,
): boolean {
  return createBoundaryMatcher(terms)(text);
}

function isBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return true;
  const char = String.fromCodePoint(text.codePointAt(index)!);
  return !WORD.test(char);
}
