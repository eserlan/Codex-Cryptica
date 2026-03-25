# Web Component Design

Build reusable, maintainable UI components using modern frameworks with clean composition patterns and styling approaches.

## Core Concepts

### 1. Component Composition Patterns

**Compound Components**: Related components that work together

```tsx
<Select value={value} onChange={setValue}>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Options>
    <Select.Option value="a">Option A</Select.Option>
    <Select.Option value="b">Option B</Select.Option>
  </Select.Options>
</Select>
```

**Slots (Vue/Svelte)**: Named content injection points

```vue
<Card>
  <template #header>Title</template>
  <template #content>Body text</template>
  <template #footer><Button>Action</Button></template>
</Card>
```

### 2. CSS-in-JS Approaches

| Solution              | Approach               | Best For                          |
| --------------------- | ---------------------- | --------------------------------- |
| **Tailwind CSS**      | Utility classes        | Rapid prototyping, design systems |
| **CSS Modules**       | Scoped CSS files       | Existing CSS, gradual adoption    |
| **styled-components** | Template literals      | React, dynamic styling            |
| **Emotion**           | Object/template styles | Flexible, SSR-friendly            |
| **Vanilla Extract**   | Zero-runtime           | Performance-critical apps         |

### 3. Component API Design

```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Principles**:

- Use semantic prop names (`isLoading` vs `loading`)
- Provide sensible defaults
- Support composition via `children`
- Allow style overrides via `className` or `style`

## Svelte 5: Runes Pattern

```svelte
<script lang="ts">
  interface Props {
    variant?: "primary" | "secondary";
    onclick?: () => void;
    children: import("svelte").Snippet;
  }

  let { variant = "primary", onclick, children }: Props = $props();
  const classes = $derived(`btn btn-${variant}`);
</script>

<button class={classes} {onclick}>
  {@render children()}
</button>
```

## Best Practices

1. **Single Responsibility**: Each component does one thing well
2. **Prop Drilling Prevention**: Use context for deeply nested data
3. **Accessible by Default**: Include ARIA attributes, keyboard support
4. **Controlled vs Uncontrolled**: Support both patterns when appropriate
5. **Forward Refs**: Allow parent access to DOM nodes
6. **Memoization**: Use appropriately for expensive renders
7. **Error Boundaries**: Wrap components that may fail
