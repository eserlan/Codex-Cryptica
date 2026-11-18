type Node = {
  // Most trie nodes in ID lists have a single child; defer Map allocation
  // until a second distinct character is inserted.
  c0?: string;
  n0?: Node;
  next?: Map<string, Node>;
  fail: Node | null;
  dictFail: Node | null;
  length: number;
};

const WORD = /[\p{L}\p{N}_-]/u;
const MAX_TRIE_TERM_LENGTH = 256;

/**
 * Short 1-2 character pure-letter IDs (such as "a" or "in") collide with
 * ordinary prose, so free-text matching skips them while still matching
 * 1-2 character codes that include digits or symbols (such as "s2" or "42").
 */
export function isFreeTextMatchableShortId(id: string): boolean {
  return id.length >= 3 || (id.length > 0 && !/^[a-z]{1,2}$/i.test(id));
}

function createNode(fail: Node | null): Node {
  return { fail, dictFail: null, length: 0 };
}

function getChild(node: Node, char: string): Node | undefined {
  if (node.next !== undefined) return node.next.get(char);
  return node.c0 === char ? node.n0 : undefined;
}

function setChild(node: Node, char: string, child: Node): void {
  if (node.next !== undefined) {
    node.next.set(char, child);
    return;
  }
  if (node.c0 === undefined) {
    node.c0 = char;
    node.n0 = child;
    return;
  }
  const map = new Map<string, Node>();
  map.set(node.c0, node.n0!);
  map.set(char, child);
  node.c0 = undefined;
  node.n0 = undefined;
  node.next = map;
}

function* childEntries(node: Node): Iterable<[string, Node]> {
  if (node.next !== undefined) {
    yield* node.next;
  } else if (node.c0 !== undefined) {
    yield [node.c0, node.n0!];
  }
}

/** Builds a case-insensitive, boundary-aware matcher with bounded trie memory. */
export function createBoundaryMatcher(
  terms: Iterable<string>,
): (text: string) => boolean {
  const root = createNode(null);
  const longTerms: string[] = [];
  for (const rawTerm of terms) {
    const term = rawTerm.toLocaleLowerCase();
    if (!term) continue;
    if (term.length > MAX_TRIE_TERM_LENGTH) {
      longTerms.push(term);
    } else {
      addTerm(root, term);
    }
  }
  assignFailureLinks(root);
  return (rawText) => {
    const text = rawText.toLocaleLowerCase();
    if (hasBoundaryMatch(root, text)) return true;
    for (const term of longTerms) {
      if (hasSingleTermBoundaryMatch(text, term)) return true;
    }
    return false;
  };
}

function addTerm(root: Node, term: string): void {
  let node = root;
  for (const char of term) {
    let next = getChild(node, char);
    if (!next) {
      next = createNode(root);
      setChild(node, char, next);
    }
    node = next;
  }
  node.length = term.length;
}

function assignFailureLinks(root: Node): void {
  const queue: Node[] = [];
  for (const [, child] of childEntries(root)) {
    child.fail = root;
    queue.push(child);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]!;
    for (const [char, child] of childEntries(node)) {
      let fallback = node.fail;
      while (fallback && !getChild(fallback, char)) fallback = fallback.fail;
      const fail = (fallback && getChild(fallback, char)) ?? root;
      child.fail = fail;
      child.dictFail = fail.length > 0 ? fail : fail.dictFail;
      queue.push(child);
    }
  }
}

function hasBoundaryMatch(root: Node, text: string): boolean {
  if (root.c0 === undefined && root.next === undefined) return false;
  let node = root;
  let index = 0;
  for (const char of text) {
    while (node !== root && !getChild(node, char)) node = node.fail ?? root;
    node = getChild(node, char) ?? root;
    if (hasBoundaryMatchAt(node, text, index + char.length)) return true;
    index += char.length;
  }
  return false;
}

function hasBoundaryMatchAt(node: Node, text: string, end: number): boolean {
  let current: Node | null = node.length > 0 ? node : node.dictFail;
  while (current !== null) {
    if (isBoundary(text, end - current.length - 1) && isBoundary(text, end)) {
      return true;
    }
    current = current.dictFail;
  }
  return false;
}

function hasSingleTermBoundaryMatch(text: string, term: string): boolean {
  if (term.length > text.length) return false;
  let from = 0;
  for (;;) {
    const start = text.indexOf(term, from);
    if (start === -1) return false;
    const end = start + term.length;
    if (isBoundary(text, start - 1) && isBoundary(text, end)) return true;
    from = start + 1;
  }
}

function isBoundary(text: string, index: number): boolean {
  if (index < 0 || index >= text.length) return true;
  const char = String.fromCodePoint(text.codePointAt(index)!);
  return !WORD.test(char);
}
