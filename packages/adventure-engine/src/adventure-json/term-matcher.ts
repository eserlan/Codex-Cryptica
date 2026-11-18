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
  const root = buildTrie(terms);
  assignFailureLinks(root);
  return (text) => hasBoundaryMatch(root, text);
}

function buildTrie(terms: Iterable<string>): Node {
  const root: Node = { next: new Map(), fail: null, lengths: [] };
  for (const rawTerm of terms) addTerm(root, rawTerm.toLocaleLowerCase());
  return root;
}

function addTerm(root: Node, term: string): void {
  if (!term) return;
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

function assignFailureLinks(root: Node): void {
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
}

function hasBoundaryMatch(root: Node, rawText: string): boolean {
  const text = rawText.toLocaleLowerCase();
  let node = root;
  let index = 0;
  for (const char of text) {
    while (node !== root && !node.next.has(char)) node = node.fail ?? root;
    node = node.next.get(char) ?? root;
    if (hasBoundaryMatchAt(node, text, index, char.length)) return true;
    index += char.length;
  }
  return false;
}

function hasBoundaryMatchAt(
  node: Node,
  text: string,
  index: number,
  charLength: number,
): boolean {
  for (const length of node.lengths) {
    const end = index + charLength;
    if (isBoundary(text, end - length - 1) && isBoundary(text, end))
      return true;
  }
  return false;
}

function isBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return true;
  const char = String.fromCodePoint(text.codePointAt(index)!);
  return !WORD.test(char);
}
