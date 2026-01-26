<script lang="ts">
	import "../app.css";
	import VaultControls from "$lib/components/VaultControls.svelte";
	import SearchModal from "$lib/components/search/SearchModal.svelte";
	import { vault } from "$lib/stores/vault.svelte";
	import { searchStore } from "$lib/stores/search";
	import { onMount } from "svelte";

	let { children } = $props();

	onMount(() => {
		vault.init();
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
	<header
		class="px-6 py-4 bg-[#0c0c0c] border-b border-green-900/30 flex justify-between items-center sticky top-0 z-10"
	>
		<h1
			class="text-xl font-bold text-gray-100 font-mono tracking-wide flex items-center gap-3 shrink-0"
		>
			<span class="text-green-500">📚</span>
			<span>Codex Arcana</span>
		</h1>

		<div class="flex-1 max-w-xl px-4">
			<div class="relative group">
				<svg
					class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-900 group-focus-within:text-green-500 transition-colors"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					placeholder="Search notes (Cmd+K)..."
					class="w-full bg-black border border-green-900/50 hover:border-green-700 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 rounded py-1.5 pl-10 pr-4 text-sm font-mono text-gray-100 transition-all placeholder:text-green-900/50"
					onfocus={() => searchStore.open()}
					value={$searchStore.query}
					oninput={(e) => searchStore.setQuery(e.currentTarget.value)}
				/>
			</div>
		</div>

		<div class="flex items-center gap-4 shrink-0">
			<VaultControls />
		</div>
	</header>

	<main class="flex-1 relative">
		{@render children()}
	</main>

	<SearchModal />
</div>
