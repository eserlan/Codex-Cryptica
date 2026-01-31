# Quickstart: Switching Vaults

## Closing the Current Vault

To switch to a different campaign, first close the active one:

```svelte
<!-- VaultControls.svelte -->
<button onclick={() => vault.close()}>
  CLOSE VAULT
</button>
```

## Mounting a New Vault

After closing, the "OPEN VAULT" button will reappear. Clicking it will trigger the standard browser file picker:

```svelte
<button onclick={() => vault.openDirectory()}>
  OPEN VAULT
</button>
```

## E2E Testing Verification

```typescript
// tests/vault-switch.spec.ts
await page.click('text=CLOSE VAULT');
await expect(page.locator('text=NO VAULT')).toBeVisible();
await expect(page.locator('[data-testid="entity-count"]')).toHaveText('0 ENTITIES');
```
