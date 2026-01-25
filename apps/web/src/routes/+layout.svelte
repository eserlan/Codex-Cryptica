<script>
	import "../app.css";
	import VaultControls from "$lib/components/VaultControls.svelte";
	import { vault } from "$lib/stores/vault.svelte";
	import { onMount } from "svelte";

	let { children } = $props();

	onMount(() => {
		vault.init();
	});
</script>

<div class="app-layout min-h-screen bg-gray-50 flex flex-col">
	<header
		class="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm sticky top-0 z-10"
	>
		<h1 class="text-xl font-bold text-gray-800 flex items-center gap-2">
			<span>📚</span> Codex Arcana
		</h1>
		<VaultControls />
	</header>

	<main class="flex-1 relative">
		{@render children()}
	</main>
</div>
