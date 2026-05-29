with open("apps/web/src/lib/components/settings/AISettings.svelte", "r") as f:
    content = f.read()

custom_image_ui = """  <!-- Custom Image Provider -->
  <div class="mt-6 pt-6 border-t border-theme-border/30">
    <div class="mb-5">
      <span class="text-sm text-theme-text font-bold uppercase font-header block mb-3">Image Generation Provider</span>
      
      <div class="flex gap-4 mb-4">
        <label class="flex items-center gap-2 text-sm text-theme-text">
          <input type="radio" name="img_provider" value="gemini" checked={oracle.settings.imageProvider === 'gemini'} onchange={() => oracle.updateSettings({ imageProvider: 'gemini' })} />
          Google Gemini API
        </label>
        <label class="flex items-center gap-2 text-sm text-theme-text">
          <input type="radio" name="img_provider" value="custom" checked={oracle.settings.imageProvider === 'custom'} onchange={() => oracle.updateSettings({ imageProvider: 'custom' })} />
          Custom (OpenAI-Compatible)
        </label>
      </div>

      {#if oracle.settings.imageProvider === 'custom'}
        <div class="space-y-4 p-4 bg-theme-bg/50 border border-theme-border rounded">
          <div>
            <label class="block text-xs uppercase font-bold text-theme-text/80 mb-1">Base URL</label>
            <input type="text" class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm" placeholder="https://api.together.xyz/v1/images/generations" value={oracle.settings.customImageBaseUrl} onchange={(e) => oracle.updateSettings({ customImageBaseUrl: e.currentTarget.value })} />
            <p class="text-[11px] text-theme-muted mt-1">Must be an OpenAI-compatible /v1/images/generations endpoint.</p>
          </div>
          <div>
            <label class="block text-xs uppercase font-bold text-theme-text/80 mb-1">API Key</label>
            <input type="password" class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm" placeholder="sk-..." value={oracle.settings.customImageApiKey} onchange={(e) => oracle.updateSettings({ customImageApiKey: e.currentTarget.value })} />
          </div>
          <div>
            <label class="block text-xs uppercase font-bold text-theme-text/80 mb-1">Model Name</label>
            <input type="text" class="w-full bg-theme-bg border border-theme-border rounded px-3 py-2 text-sm" placeholder="black-forest-labs/FLUX.1-schnell" value={oracle.settings.customImageModel} onchange={(e) => oracle.updateSettings({ customImageModel: e.currentTarget.value })} />
          </div>
        </div>
      {/if}
    </div>
  </div>

</div>"""

content = content.replace("  {/if}\n</div>", "  {/if}\n" + custom_image_ui)

with open("apps/web/src/lib/components/settings/AISettings.svelte", "w") as f:
    f.write(content)
