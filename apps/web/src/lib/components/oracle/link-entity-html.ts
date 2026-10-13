import { linkTitles, type EntityLike } from "entity-mention-engine";

/** Elements whose text must stay exactly as written. */
const SKIPPED = new Set(["A", "CODE", "PRE", "SCRIPT", "STYLE"]);

/**
 * Turns exact entity titles in rendered assistant HTML into links that carry
 * the entity id. Only text nodes are changed, so markup, code and existing
 * links are untouched. Titles are inserted as text, never as HTML.
 */
export function linkEntityTitlesInHtml(
  html: string,
  sources: EntityLike[],
): string {
  if (!html || sources.length === 0 || typeof DOMParser === "undefined")
    return html;

  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html",
  );
  const root = doc.body;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      for (
        let el = node.parentElement;
        el && el !== root;
        el = el.parentElement
      ) {
        if (SKIPPED.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const node of textNodes) {
    const mentions = linkTitles(node.data, sources);
    if (mentions.length === 0) continue;

    const fragment = doc.createDocumentFragment();
    let cursor = 0;
    for (const mention of mentions) {
      if (mention.start > cursor)
        fragment.append(node.data.slice(cursor, mention.start));
      const link = doc.createElement("a");
      link.href = "#";
      link.dataset.entityId = mention.entityId;
      link.setAttribute("aria-label", `Open ${mention.displayName}`);
      link.textContent = mention.displayName;
      fragment.append(link);
      cursor = mention.end;
    }
    if (cursor < node.data.length) fragment.append(node.data.slice(cursor));
    node.replaceWith(fragment);
  }

  return root.innerHTML;
}

/**
 * Svelte action: opens the entity behind a linked title. Uses one listener on
 * the container, so re-rendering the reply does not re-bind anything.
 */
export function entityLinkClicks(
  node: HTMLElement,
  onOpen: (entityId: string) => void,
) {
  const handle = (event: MouseEvent) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>(
      "a[data-entity-id]",
    );
    if (!link?.dataset.entityId) return;
    event.preventDefault();
    onOpen(link.dataset.entityId);
  };
  node.addEventListener("click", handle);
  return {
    destroy() {
      node.removeEventListener("click", handle);
    },
  };
}
