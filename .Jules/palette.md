## $(date +%Y-%m-%d) - Add aria-hidden to decorative icons
**Learning:** Icon-only buttons with `aria-label` should also have `aria-hidden="true"` applied to the inner icon spans (e.g. `<span class="icon-[...]" aria-hidden="true">`) to prevent screen readers from reading confusing redundant class names and ensure they only announce the parent's `aria-label`.
**Action:** Always add `aria-hidden="true"` to icon spans within `aria-label` buttons during UI creation or accessibility passes.
