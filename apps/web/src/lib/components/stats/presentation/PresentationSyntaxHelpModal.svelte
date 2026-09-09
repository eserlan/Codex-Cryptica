<script lang="ts">
  let { onClose }: { onClose: () => void } = $props();
</script>

<div
  class="fixed inset-0 z-[210] flex items-center justify-center bg-theme-bg/85 p-4 backdrop-blur-xs"
  role="presentation"
  onclick={(e) => e.target === e.currentTarget && onClose()}
>
  <div
    class="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="syntax-help-title"
    data-testid="presentation-syntax-help-modal"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border bg-theme-bg/50 p-3.5"
    >
      <div class="flex items-center gap-2">
        <span
          class="icon-[lucide--book-open] h-4 w-4 text-theme-primary"
          aria-hidden="true"
        ></span>
        <h3
          id="syntax-help-title"
          class="font-header text-xs font-bold uppercase tracking-widest text-theme-text"
        >
          Presentation Template Syntax Guide
        </h3>
      </div>
      <button
        type="button"
        class="text-theme-muted hover:text-theme-text"
        onclick={onClose}
        aria-label="Close syntax guide"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-theme-text">
      <div
        class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
      >
        <h4
          class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
        >
          1. Field References
        </h4>
        <p class="text-theme-muted text-[11px]">
          Reference stat fields using simple brackets <code
            class="rounded bg-theme-bg px-1 font-mono text-theme-primary"
            >[field_id]</code
          >
          or mustache syntax
          <code class="rounded bg-theme-bg px-1 font-mono text-theme-primary"
            >&#123;&#123;stat.field_id&#125;&#125;</code
          >.
        </p>
        <p class="text-theme-muted text-[11px]">
          In the Visual Builder, right-click a field chip to choose a
          compatible display mode or hide its label.
        </p>
        <div
          class="font-mono text-[11px] space-y-1 bg-theme-bg p-2 rounded border border-theme-border"
        >
          <div>
            <span class="text-theme-primary">[hp]</span>
            <span class="text-theme-muted">→ Standard field display</span>
          </div>
          <div>
            <span class="text-theme-primary">[ac:prominent]</span>
            <span class="text-theme-muted"
              >→ Prominent / large score badge</span
            >
          </div>
          <div>
            <span class="text-theme-primary">[hp:current-max]</span>
            <span class="text-theme-muted">→ Counter with max value</span>
          </div>
          <div>
            <span class="text-theme-primary"
              >&#123;&#123;stat.speed hide-label&#125;&#125;</span
            >
            <span class="text-theme-muted"
              >→ Hide field label (boolean syntax)</span
            >
          </div>
          <div>
            <span class="text-theme-primary"
              >&#123;&#123;stat.speed label=""&#125;&#125;</span
            >
            <span class="text-theme-muted"
              >→ Hide field label (empty label string)</span
            >
          </div>
          <div>
            <span class="text-theme-primary"
              >&#123;&#123;stat.str label="Strength"&#125;&#125;</span
            >
            <span class="text-theme-muted">→ Custom label override</span>
          </div>
        </div>
      </div>

      <div
        class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
      >
        <h4
          class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
        >
          2. Available Display Modes
        </h4>
        <div class="overflow-x-auto">
          <table class="w-full text-[11px] border-collapse text-left">
            <thead>
              <tr class="border-b border-theme-border/60 text-theme-primary">
                <th class="py-1 px-1">Mode</th>
                <th class="py-1 px-1">Supported Types</th>
                <th class="py-1 px-1">Effect</th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-theme-border/40 text-theme-text font-mono text-[10px]"
            >
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold">plain</td>
                <td class="py-1 px-1 text-theme-muted">All types</td>
                <td class="py-1 px-1 font-sans"
                  >Standard inline label & input</td
                >
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold"
                  >prominent</td
                >
                <td class="py-1 px-1 text-theme-muted"
                  >number, dice, counter</td
                >
                <td class="py-1 px-1 font-sans">Big, bold stat score</td>
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold"
                  >current-max</td
                >
                <td class="py-1 px-1 text-theme-muted">counter</td>
                <td class="py-1 px-1 font-sans"
                  >Counter badge (e.g. 12 / 20)</td
                >
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold">counter</td
                >
                <td class="py-1 px-1 text-theme-muted">counter</td>
                <td class="py-1 px-1 font-sans"
                  >Interactive stepper (— / +)</td
                >
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold"
                  >progress</td
                >
                <td class="py-1 px-1 text-theme-muted">counter</td>
                <td class="py-1 px-1 font-sans">Resource progress bar</td>
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold"
                  >checkbox</td
                >
                <td class="py-1 px-1 text-theme-muted">text</td>
                <td class="py-1 px-1 font-sans">Checkable toggle box</td>
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold"
                  >tag-list</td
                >
                <td class="py-1 px-1 text-theme-muted">text</td>
                <td class="py-1 px-1 font-sans">Comma-separated pill tags</td>
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold">notes</td>
                <td class="py-1 px-1 text-theme-muted">longtext</td>
                <td class="py-1 px-1 font-sans">Multi-line text area</td>
              </tr>
              <tr>
                <td class="py-1 px-1 text-theme-primary font-bold">table</td>
                <td class="py-1 px-1 text-theme-muted">item-table</td>
                <td class="py-1 px-1 font-sans"
                  >Interactive repeatable table (weapons/items or custom
                  columns)</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
      >
        <h4
          class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
        >
          3. Card Containers (<code class="font-mono text-theme-primary"
            >:::card</code
          >)
        </h4>
        <p class="text-theme-muted text-[11px]">
          Wrap layout content inside card borders with fenced directives.
        </p>
        <pre
          class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
:::card
### Section Title
[field_1]
:::
        </pre>
      </div>

      <div
        class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
      >
        <h4
          class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
        >
          4. Multi-Column Grids (<code class="font-mono text-theme-primary"
            >:::stat-group columns=N</code
          >)
        </h4>
        <p class="text-theme-muted text-[11px]">
          Arrange stat fields into 1 to 6 responsive grid columns.
        </p>
        <pre
          class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
:::card
:::stat-group columns=3
[str:prominent]
[dex:prominent]
[con:prominent]
:::
:::
        </pre>
      </div>

      <div
        class="rounded border border-theme-border/70 bg-theme-bg/40 p-3 space-y-1.5"
      >
        <h4
          class="font-bold text-theme-primary uppercase text-[10px] tracking-wide"
        >
          5. Markdown Tables
        </h4>
        <p class="text-theme-muted text-[11px]">
          Use standard GFM Markdown tables to embed rollable attacks or stats
          in table rows.
        </p>
        <pre
          class="font-mono text-[11px] bg-theme-bg p-2 rounded border border-theme-border text-theme-text overflow-x-auto">
| Attack | Bonus | Damage |
| --- | --- | --- |
| Shortsword | [atk_bonus] | [damage] |
        </pre>
      </div>
    </div>

    <div class="border-t border-theme-border p-3 flex justify-end">
      <button
        type="button"
        class="rounded bg-theme-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-theme-bg hover:opacity-90"
        onclick={onClose}
      >
        Got it
      </button>
    </div>
  </div>
</div>
