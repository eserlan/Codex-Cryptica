<script lang="ts">
	import "../app.css";
	import VaultControls from "$lib/components/VaultControls.svelte";
	import CloudStatus from "$lib/components/settings/CloudStatus.svelte";
	import SearchModal from "$lib/components/search/SearchModal.svelte";
	import OracleWindow from "$lib/components/oracle/OracleWindow.svelte";
	import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
	import { vault } from "$lib/stores/vault.svelte";
	import { oracle } from "$lib/stores/oracle.svelte";
	import { categories } from "$lib/stores/categories.svelte";
	import { searchStore } from "$lib/stores/search";
	import { uiStore } from "$stores/ui.svelte";
	import { syncStats } from "$stores/sync-stats";
	import { cloudConfig } from "$stores/cloud-config";
	import { workerBridge } from "$lib/cloud-bridge/worker-bridge";
	import { onMount } from "svelte";

	import { page } from "$app/state";
	import { base } from "$app/paths";
	let { children } = $props();

	const isPopup = $derived(page.url.pathname === `${base}/oracle`);
	const isLegalPage = $derived(
		page.url.pathname.includes("/privacy") ||
			page.url.pathname.includes("/terms"),
	);

	onMount(() => {
		vault.init();
		categories.init();

		// Expose for E2E testing
		if (import.meta.env.DEV) {
			(window as any).searchStore = searchStore;
			(window as any).vault = vault;
			(window as any).oracle = oracle;
			(window as any).categories = categories;
			(window as any).uiStore = uiStore;
			(window as any).syncStats = syncStats;
			(window as any).cloudConfig = cloudConfig;
			(window as any).workerBridge = workerBridge;
		}
	});

	const handleKeydown = (event: KeyboardEvent) => {
		if ((event.metaKey || event.ctrlKey) && event.key === "k") {
			event.preventDefault();
			searchStore.open();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="app-layout min-h-screen bg-black flex flex-col">
	{#if !isPopup}
		<header
			class="px-4 md:px-6 py-3 md:py-4 bg-[#0c0c0c] border-b border-green-900/30 flex flex-wrap md:flex-nowrap justify-between items-center sticky top-0 z-50 gap-y-3"
		>
			<h1
				class="text-lg md:text-xl font-bold text-gray-100 font-mono tracking-wide flex items-center gap-2 md:gap-3 shrink-0"
			>
				<span class="icon-[lucide--book-open] text-green-500 w-5 h-5"
				></span>
				<span class="hidden sm:inline">Codex Cryptica</span>
				<span class="sm:hidden text-green-500">CC</span>
			</h1>

			<div class="flex-1 order-3 md:order-2 w-full md:max-w-xl md:px-4">
				<div class="relative group">
					<span
						class="absolute left-3 top-1/2 -translate-y-1/2 icon-[heroicons--magnifying-glass] w-4 h-4 text-green-900 group-focus-within:text-green-500 transition-colors"
					></span>
					<input
						type="text"
						placeholder="Search (Cmd+K)..."
						class="w-full bg-black border border-green-900/50 hover:border-green-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 rounded py-1.5 pl-10 pr-4 text-sm font-mono text-gray-100 transition-all placeholder:text-green-900/50"
						onfocus={() => searchStore.open()}
						value={$searchStore.query}
						oninput={(e) =>
							searchStore.setQuery(e.currentTarget.value)}
					/>
				</div>
			</div>

			<div
				class="flex items-center gap-2 md:gap-4 shrink-0 order-2 md:order-3"
			>
				<VaultControls />
				<CloudStatus />
				<button
					class="w-8 h-8 flex items-center justify-center border transition-all {uiStore.showSettings &&
					uiStore.activeSettingsTab !== 'sync'
						? 'border-green-500 bg-green-900/10 text-green-500'
						: 'border-green-900/30 hover:border-green-500 text-green-900 hover:text-green-500'}"
					onclick={() => uiStore.toggleSettings("vault")}
					title="Application Settings"
				>
					<span class="icon-[lucide--settings] w-5 h-5"></span>
				</button>
			</div>
		</header>
	{/if}

	<main class="flex-1 relative">
		{@render children()}
	</main>

	{#if !isPopup}
		<footer
			class="px-6 py-4 bg-[#080808] border-t border-green-900/10 flex flex-col md:flex-row justify-between items-center gap-4"
		>
			<div
				class="text-[10px] font-mono text-green-900/60 uppercase tracking-widest"
			>
				&copy; 2026 Codex Cryptica // Local-First Intelligence
			</div>
			<div class="flex gap-6">
				<a
					href="{base}/privacy"
					target="_blank"
					rel="noopener noreferrer"
					class="text-[10px] font-mono text-green-700 hover:text-green-500 transition-colors uppercase tracking-widest"
					>Privacy Policy</a
				>
				<a
					href="{base}/terms"
					target="_blank"
					rel="noopener noreferrer"
					class="text-[10px] font-mono text-green-700 hover:text-green-500 transition-colors uppercase tracking-widest"
					>Terms of Service</a
				>
			</div>
		</footer>
		<SearchModal />
		{#if !isLegalPage}
			<OracleWindow />
		{/if}
		<SettingsModal />
	{/if}
</div>
