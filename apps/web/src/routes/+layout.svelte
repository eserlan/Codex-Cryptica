<script lang="ts">
	import "../app.css";
	import VaultControls from "$lib/components/VaultControls.svelte";
	import CloudStatus from "$lib/components/settings/CloudStatus.svelte";
	import SearchModal from "$lib/components/search/SearchModal.svelte";
	import OracleWindow from "$lib/components/oracle/OracleWindow.svelte";
	import CategoryManagerModal from "$lib/components/settings/CategoryManagerModal.svelte";
	import { vault } from "$lib/stores/vault.svelte";
	import { categories } from "$lib/stores/categories.svelte";
	import { searchStore } from "$lib/stores/search";
	import { syncStats } from "$stores/sync-stats";
	import { cloudConfig } from "$stores/cloud-config";
	import { onMount } from "svelte";

	import { page } from "$app/state";
	let { children } = $props();

	const isPopup = $derived(page.url.pathname === "/oracle");

	onMount(() => {
		vault.init();
		categories.init();

		// Expose for E2E testing
		if (import.meta.env.DEV) {
			(window as any).searchStore = searchStore;
			(window as any).vault = vault;
			(window as any).categories = categories;
			(window as any).syncStats = syncStats;
			(window as any).cloudConfig = cloudConfig;
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
				<span class="hidden sm:inline">Codex Arcana</span>
				<span class="sm:hidden text-green-500">CA</span>
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
			</div>
		</header>
	{/if}

	<main class="flex-1 relative">
		{@render children()}
	</main>

	{#if !isPopup}
		<SearchModal />
		<OracleWindow />
		<CategoryManagerModal />
	{/if}
</div>
