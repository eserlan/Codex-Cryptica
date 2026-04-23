---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design Skill

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Project Standards (Codex-Cryptica)

**CRITICAL: You MUST strictly adhere to the following project-specific standards for every UI task.**

- **Design System**: ALWAYS read and adhere to \`@docs/STYLE_GUIDE.md\`.
- **Framework**: Use **Svelte 5 Runes** (\`\$state\`, \`\$derived\`, \`\$props\`) exclusively.
- **Styling**: Use **Tailwind 4 semantic tokens** (e.g., \`bg-theme-surface\`, \`text-theme-primary\`). NEVER use hardcoded hex codes.
- **Icons**: NEVER use \`lucide-svelte\` components. ALWAYS use the Iconify utility pattern: \`class="icon-[lucide--name] h-4 w-4"\`.
- **Data Integrity**: Use \`\$state.snapshot()\` when passing reactive state to non-reactive logic or asynchronous handlers.
- **Testing**: Every UI change or addition MUST be accompanied by a unit test (e.g., \`*.test.ts\`).

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve?
- **Tone**: Pick an extreme: brutally minimal, sci-fi/retro-futuristic, organic, luxury, etc.
- **Constraints**: Svelte 5, Tailwind 4, Accessibility (ARIA).

## Frontend Aesthetics Guidelines

- **Typography**: Use font variables (\`font-header\`, \`font-body\`) defined in the theme.
- **Color & Theme**: Use the semantic theme tokens. Ensure contrast and readability across all themes (Fantasy, Sci-Fi, etc.).
- **Motion**: Prioritize CSS transitions and Svelte built-in transitions for micro-interactions.
- **Spatial Composition**: Meticulous attention to spacing, negative space, and responsive layout using Tailwind utilities.

NEVER use generic AI-generated aesthetics. Interpret creatively while staying within the boundaries of the Codex-Cryptica design system.
