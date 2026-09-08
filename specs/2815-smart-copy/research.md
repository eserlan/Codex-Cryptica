# Research: Smart Multi-Format Copy

## Decision 1: Use progressive enhancement around one ClipboardItem

**Decision**: For smart content, create one clipboard item containing `text/plain` and `text/html`, plus `image/png` only for the existing optional entity-image path. Feature-detect clipboard-item creation and `clipboard.write`; if either is unavailable or the rich write rejects, call `writeText` with the canonical text.

**Rationale**: A single item lets the paste destination select its preferred representation. The Clipboard API is restricted to secure contexts and write capability/permissions vary, so the issue’s plain fallback is required. Current platform documentation also notes that operating systems may ignore additional clipboard items, which reinforces using one item with multiple representations rather than multiple items.

**Alternatives considered**:

- Detect Word, Google Docs, Gmail, or Markdown editors: rejected because destination detection is brittle, invasive, and explicitly outside scope.
- Always call `writeText`: rejected because it discards useful structure in rich destinations.
- Write separate clipboard items per MIME type: rejected because multi-item support is not dependable and does not model alternative representations of one payload.

References: [MDN Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write), [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText), [Clipboard API specification](https://w3c.github.io/clipboard-apis/).

## Decision 2: Make Markdown canonical and let the service own safe HTML

**Decision**: Introduce `copyContent({ markdown, html?, imageBlob? })`. If HTML is omitted, the service renders the Markdown with the existing `marked` dependency. Whether generated internally or supplied by a compatibility caller, HTML is sanitised by the service immediately before it is placed on the clipboard.

**Rationale**: This preserves one canonical source, eliminates repeated Markdown-to-HTML work for new callers, and establishes a security boundary callers cannot accidentally bypass. An optional supplied HTML representation is still needed for existing entity structure and compatibility callers that already prepare useful semantic HTML.

**Alternatives considered**:

- Require every caller to provide HTML: rejected because it duplicates conversion and makes sanitisation easy to omit.
- Accept pre-sanitised HTML without re-sanitising: rejected because the shared contract should enforce safety at its boundary.
- Use generator display HTML: rejected because it contains app-specific classes and interactive markup; clipboard HTML should be semantic and destination-neutral.

## Decision 3: Inject clipboard-item construction

**Decision**: Extend constructor dependencies with an optional clipboard-item factory (or equivalent constructor wrapper), while retaining sensible browser defaults. Represent clipboard capabilities with the narrow methods the service uses.

**Rationale**: The current service injects `Clipboard`, fetch, document, Markdown parsing, and sanitisation but reads global `ClipboardItem` directly. Injecting item construction makes missing-capability and MIME payload tests deterministic and satisfies the repository’s constructor-DI rule.

**Alternatives considered**:

- Continue stubbing the global in every test: rejected because it hides a production capability dependency and makes unsupported-browser tests awkward.
- Add a clipboard polyfill: rejected because plain-text fallback is smaller and sufficient.

## Decision 4: Extract generator copy-document assembly

**Decision**: Add `components/seo/generator-copy.ts` to assemble canonical full-result, section, and historical-result Markdown from generator/session data. Rich HTML is produced by the shared clipboard service from that Markdown.

**Rationale**: `SEOGeneratorLayout.svelte` is already 1,001 lines. Document construction is independently testable domain formatting and does not belong in the page orchestrator. A shared builder also prevents current and historical copies from drifting.

**Alternatives considered**:

- Keep the array/join logic in the Svelte component: rejected by the bounded-responsibility gate and because Session Hub would duplicate it.
- Move clipboard code into `generator-engine`: rejected because clipboard APIs are web-specific and the engine does not need them. Only the small app-level formatting adapter is required.
- Reuse `renderGeneratorMarkdown`: rejected for clipboard output because that helper deliberately emits themed display wrappers, classes, and inline Copy buttons.

## Decision 5: Treat Session Hub Copy as part of this slice, not lineage

**Decision**: Add the Copy action to `EntityDetailModal.svelte` in this slice, using the shared generator copy builder/service. Do not implement the unrelated refinement-lineage model from #2824.

**Rationale**: #2826 and #2828 explicitly require Session Hub smart copy, and the current modal has no Copy action. The lineage work is independently scoped under #2824 and is unnecessary for clipboard behaviour.

**Alternatives considered**:

- Wait for #2824: rejected because the smart-copy epic can deliver its explicitly required modal action without taking on lineage.
- Implement all of #2824: rejected as scope expansion.

## Decision 6: Audit by user intent, not by API spelling

**Decision**: Use this classification for current call sites. Re-run the inventory immediately before implementation because concurrent branches may add callers.

| Surface / call family                                                                                                                                                                                                                                                                | Classification                          | Planned action                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------- |
| Public generator full result (`apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`)                                                                                                                                                                                           | Document-like Markdown                  | Migrate to `copyContent`                                                        |
| Public generator section (`apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`)                                                                                                                                                                                               | Document-like Markdown                  | Migrate to `copyContent`                                                        |
| Session Hub detail (`apps/web/src/lib/components/seo/EntityDetailModal.svelte`)                                                                                                                                                                                                      | Document-like Markdown                  | Add through shared generator helper/service                                     |
| Entity read modal (`apps/web/src/lib/components/modals/NodeReadModal.svelte`)                                                                                                                                                                                                        | Document-like Markdown                  | Replace ad-hoc dual-MIME write with service                                     |
| Entity Zen copy (`apps/web/src/lib/components/zen/ZenView.svelte`)                                                                                                                                                                                                                   | Existing smart document copy            | Preserve via `copyEntity` compatibility delegate                                |
| Oracle messages (`apps/web/src/lib/components/oracle/chat-message-controller.svelte.ts`)                                                                                                                                                                                             | Existing smart document copy            | Preserve via `copyHtmlAndText` compatibility delegate                           |
| Character-chat export (`apps/web/src/lib/services/character-chat-export.ts`)                                                                                                                                                                                                         | Existing smart document copy            | Preserve via `copyHtmlAndText` compatibility delegate                           |
| Generator inline names (`apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`)                                                                                                                                                                                                 | Literal short values                    | Keep plain                                                                      |
| Share/help/publishing URLs (`apps/web/src/lib/services/publishing/guest-link.ts`, `apps/web/src/lib/stores/help.svelte.ts`, `apps/web/src/lib/components/settings/PublishingDashboard.svelte`, `apps/web/src/lib/components/settings/PublishingSettings.svelte`)                     | Literal URLs                            | Keep plain                                                                      |
| Recovery keys, owner tokens, cloud keys (`apps/web/src/lib/components/settings/CloudBackupSettings.svelte`, `apps/web/src/lib/components/stats/community-template/TemplateOwnerRecovery.svelte`, `apps/web/src/lib/components/stats/community-template/TemplatePublishModal.svelte`) | Secrets/tokens                          | Keep plain                                                                      |
| Image/art-direction prompts (`apps/web/src/lib/components/modals/ImagePromptReviewModal.svelte`, `apps/web/src/lib/components/entity-detail/DetailImage.svelte`, `apps/web/src/lib/components/zen/ZenSidebar.svelte`)                                                                | Literal prompts                         | Keep plain                                                                      |
| Silhouette SVG/XML and CDN URL (`apps/web/src/routes/(marketing)/silhouettes/+page.svelte`)                                                                                                                                                                                          | Raw source / URL                        | Keep plain                                                                      |
| Debug logs and sound-bite transcript (`apps/web/src/lib/components/debug/DebugConsole.svelte`, `apps/web/src/lib/components/entity-detail/DetailSoundBite.svelte`)                                                                                                                   | Intentionally plain records             | Keep plain                                                                      |
| Star-system diagram image (`apps/web/src/lib/components/seo/StarSystemDiagram.svelte`)                                                                                                                                                                                               | Special image-only export               | Keep image copy/download fallback                                               |
| Random table/deck result strings (`apps/web/src/lib/components/random/DeckView.svelte`, `apps/web/src/lib/components/random/TableRoller.svelte`)                                                                                                                                     | Plain result with no Markdown structure | Keep existing plain helper unless future formatting gives it document semantics |

**Rationale**: Blanket replacement would make secrets, URLs, source, and short literal values less predictable without adding user value.

**Alternatives considered**:

- Replace every `navigator.clipboard` call: rejected by the epic’s product rule.
- Add a custom lint rule immediately: rejected as premature; documentation and the audit are sufficient unless regressions recur.

## Decision 7: Preserve existing feedback and analytics ownership

**Decision**: The shared service returns `Promise<boolean>` and does not own UI messages or analytics. Existing surfaces keep their timers and analytics; Session Hub adds `copy_target: "session_hub_detail"`. Total failure results in existing/local error feedback without closing or mutating content.

**Rationale**: The service should own clipboard policy, while components own presentation and product telemetry. This retains current behaviour and keeps the service reusable.

**Alternatives considered**:

- Emit notifications and analytics from the service: rejected because it couples infrastructure to surface-specific UI and metadata.
