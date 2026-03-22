# Svelte 5 Development

Svelte 5 patterns including TanStack Query mutations, shadcn-svelte components, and component composition.

## Mutation Pattern Preference

### In Svelte Files (.svelte)

Always prefer `createMutation` from TanStack Query for mutations:

```svelte
<script lang="ts">
  import { createMutation } from "@tanstack/svelte-query";
  import * as rpc from "$lib/query";

  const deleteSessionMutation = createMutation(
    rpc.sessions.deleteSession.options,
  );

  let isDialogOpen = $state(false);
</script>

<Button
  onclick={() => {
    deleteSessionMutation.mutate(
      { sessionId },
      {
        onSuccess: () => {
          isDialogOpen = false;
          toast.success("Session deleted");
          goto("/sessions");
        },
        onError: (error) => {
          toast.error(error.title, { description: error.description });
        },
      },
    );
  }}
  disabled={deleteSessionMutation.isPending}
>
  {#if deleteSessionMutation.isPending}
    Deleting...
  {:else}
    Delete
  {/if}
</Button>
```

### In TypeScript Files (.ts)

Always use `.execute()`:

```typescript
const result = await rpc.sessions.createSession.execute({
  body: { title: "New Session" },
});
```

### Inline Simple Handler Functions

```svelte
<!-- Good: Inline simple handlers -->
<Button onclick={() => shareMutation.mutate({ id })}>Share</Button>
```

## shadcn-svelte Best Practices

### Component Organization

- Use the CLI: `bunx shadcn-svelte@latest add [component]`
- Each component in its own folder under `$lib/components/ui/` with an `index.ts` export
- Follow kebab-case for folder names (e.g., `dialog/`, `toggle-group/`)

### Import Patterns

**Namespace imports** (preferred for multi-part components):

```typescript
import * as Dialog from "$lib/components/ui/dialog";
import * as ToggleGroup from "$lib/components/ui/toggle-group";
```

**Lucide icons** (always use individual imports from `@lucide/svelte`):

```typescript
import Database from "@lucide/svelte/icons/database";
import MinusIcon from "@lucide/svelte/icons/minus";
```

### Styling and Customization

- Always use the `cn()` utility from `$lib/utils` for combining Tailwind classes
- Modify component code directly rather than overriding styles with complex CSS
- Use `tailwind-variants` for component variant systems

## Self-Contained Component Pattern

### The Pattern (Preferred)

```svelte
<!-- DeleteItemButton.svelte -->
<script>
  let { item } = $props();
  let open = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Trigger>
    <Button>Delete</Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content>
    <!-- Dialog content -->
  </AlertDialog.Content>
</AlertDialog.Root>
```

### Why This Pattern Works

- No parent state pollution
- Better encapsulation
- Simpler mental model
- No callbacks needed
- Scales better

### When to Apply

- Action buttons in table rows (delete, edit, etc.)
- Confirmation dialogs for list items
- Any repeating UI element that needs modal interactions
