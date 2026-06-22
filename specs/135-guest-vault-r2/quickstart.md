# Quickstart: Published Guest Vault Snapshots

This guide explains how to run, test, and verify the Cloudflare R2 guest snapshots feature locally and in production.

## Prerequisites

1. **Bun**: Verify you are running Bun:
   ```bash
   bun --version
   ```
2. **Wrangler**: Ensure wrangler CLI is installed locally to run the local worker proxy:
   ```bash
   npx wrangler --version
   ```

---

## Local Development Setup

### 1. Launch local Cloudflare Worker & R2 Bucket
Run the oracle-proxy worker locally. We need to define local wrangler configuration for R2 binding.
Under `apps/workers/oracle-proxy/wrangler.toml`, add:
```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "codex-cryptica-statics"
preview_bucket_name = "codex-cryptica-statics-local"
```

Start the dev server:
```bash
cd apps/workers/oracle-proxy
bun run wrangler dev
```
This runs the local API gateway at `http://localhost:8787`.

### 2. Start the web application
From the repository root, start the Vite development server for SvelteKit:
```bash
bun run dev
```
This opens the app at `http://localhost:5173`.

---

## Running Verification Tests

### 1. Unit Tests
Run unit tests for both client-side components and packages:
```bash
bun run test
```

### 2. Manual Verification Flow
1. Open the local Codex app.
2. Select a vault/campaign with mixed visibility settings (e.g. some player-visible, some GM-only).
3. Open Vault Settings -> click **"Publish Guest Snapshot"**.
4. Verify the **Publish Preview** shows correct counts of included vs. excluded content.
5. Confirm publish. The client generates a `publishId` and `writeToken`, uploads the files, and displays a guest link (e.g. `http://localhost:5173/guest/[publishId]`).
6. Copy the link and open it in an incognito window.
7. Confirm that the vault loads, search works, clicking nodes works, and all edit capabilities/buttons are hidden.
8. Go back to the host window, go to publishing settings, and click **"Unpublish"**.
9. Verify that visiting the guest link now returns a 404/unpublished error.
