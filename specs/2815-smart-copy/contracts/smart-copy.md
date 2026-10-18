# Contract: Smart Content Copy

## Public service contract

```ts
export interface SmartCopyContent {
  markdown: string;
  html?: string;
  imageBlob?: Blob;
}

export interface ClipboardDependencies {
  clipboard?: Pick<Clipboard, "write" | "writeText">;
  createClipboardItem?: (data: Record<string, Blob>) => ClipboardItem;
  fetch?: typeof fetch;
  document?: Document;
  marked?: typeof marked;
  domPurify?: Pick<typeof DOMPurify, "sanitize">;
}

export class ClipboardService {
  constructor(deps?: ClipboardDependencies);

  copyContent(content: SmartCopyContent): Promise<boolean>;

  // Compatibility APIs delegate to copyContent.
  copyHtmlAndText(html: string, text: string): Promise<boolean>;
  copyEntity(entity: Entity, resolvedImageUrl?: string): Promise<boolean>;
}
```

The exact narrow dependency types may be adjusted to satisfy DOM typings, but the observable behaviour below is fixed.

## Behaviour contract

### Preferred path

Given `SmartCopyContent`, the service:

1. Uses `html` when supplied; otherwise parses `markdown` as Markdown.
2. Sanitises the resulting HTML regardless of its source.
3. Creates blobs with exact MIME types `text/plain` and `text/html`.
4. Adds `image/png` only when a valid optional image blob is present.
5. Creates one clipboard item from those representations.
6. Calls the injected/default multi-format write once.
7. Returns `true` only after that write resolves.

### Fallback path

The service calls `writeText(markdown)` when any of these is true:

- clipboard-item construction is unavailable;
- multi-format `write` is unavailable;
- Markdown rendering, HTML sanitisation, item construction, or multi-format writing throws/rejects.

It returns `true` if fallback resolves and `false` if fallback is unavailable or rejects. The fallback value is the exact supplied `markdown` string.

### Safety

- Supplied HTML is untrusted and receives the same sanitisation as generated HTML.
- Script elements, event-handler attributes, and unsafe URL schemes must not reach `text/html`.
- The service does not use unsanitised clipboard-write options.
- No clipboard content is sent over the network. Existing optional entity-image fetching is the only pre-existing exception and occurs only when its URL is explicitly supplied to `copyEntity`.

### Compatibility

- `copyHtmlAndText(html, text)` maps to `{ html, markdown: text }`.
- `copyEntity(...)` assembles the existing title/Chronicle/Deep Lore representations, prepares an optional image when requested, then delegates its final write and fallback to `copyContent(...)`.
- Existing callers continue to receive `Promise<boolean>`.

## Generator formatting contract

The generator helper returns canonical Markdown; it does not write to the clipboard and does not emit themed display HTML.

### Full current result

Order:

1. `# {title}`
2. optional emphasised summary
3. existing labels line
4. main document Markdown
5. optional “At the Table”/lore Markdown

### Historical result

Order matches the full result where stored data permits. Because Session Hub `content` already begins with the emphasised summary, the builder must not add `summary` a second time.

### Section

The exact trimmed section source Markdown is canonical. Its heading remains present when it is present in the section source.

## UI integration contract

- Full and section actions retain current success reset timing and analytics targets.
- Session Hub detail displays “Copy”, changes briefly to “Copied!” after `true`, and exposes non-destructive error feedback after `false`.
- Session Hub emits the existing public-generator copy event with `copy_target: "session_hub_detail"`.
- Copy failure never closes the modal or mutates/removes the selected session entity.
- Inline generator name buttons remain literal plain-text copies.
