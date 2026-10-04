# Quickstart: Validate Shareable Generated Entities

## Focused automated checks

```bash
bun test packages/schema/src/shared-result.test.ts
bun test apps/workers/oracle-proxy/src/__tests__/share-snapshots.test.ts
bun test apps/web/src/lib/services/sharing/ShareSnapshotService.test.ts
bun test apps/web/src/lib/components/sharing/ShareEntityModal.test.ts
bun test apps/web/src/routes/(marketing)/share/[shareId]/page.test.ts
```

Add the entry-point component tests for public generator, Session Hub detail, and vault entity detail to the same focused run once their file locations are established.

## Manual acceptance path

1. Generate a public-generator entity, share it, approve the consent wording, and use Copy link or native share.
2. Change or replace the local result. The link must still show the first result.
3. Share a retained Session Hub entity, then share a saved vault entity. Confirm each opens a single entity, never a vault or its relationships/assets.
4. Open the link in a private browser context. Confirm readable content, a `noindex` response/meta directive, and a generator-specific action.
5. Revoke from the creator browser; confirm the link now shows unavailable. Open the link from another browser and confirm no revoke control is available.
6. Exercise invalid payload, 64 KB overflow, rejected Turnstile/rate limit, network failure, native-share cancellation, and clipboard failure. Local entities must remain unchanged and retryable.

## Final gates

```bash
bun run lint:types
bun run lint
bun run test
```

Run the specialist `codex-review` pass before any PR. No discovery audit is needed because the public reader route is explicitly `noindex`.
