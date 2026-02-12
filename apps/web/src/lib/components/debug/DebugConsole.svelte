<script lang="ts">
	import { debugStore } from '$lib/stores/debug.svelte';
	import { fade } from 'svelte/transition';

	let isOpen = $state(false);
	// Auto-subscribed value
	let logs = $derived($debugStore);

	const copyLogsToClipboard = () => {
		const logText = logs
			.map((log) => {
				let dataStr = '';
				if (log.data) {
					try {
						dataStr = JSON.stringify(log.data, null, 2);
					} catch {
						dataStr = '[Unserializable data]';
					}
				}
				return `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level.toUpperCase()}] ${
					log.message
				} ${dataStr}`;
			})
			.reverse()
			.join('\n');

		navigator.clipboard.writeText(logText).catch((err) => {
			console.error('Failed to copy logs: ', err);
		});
	};
</script>

{#if logs.length > 0}
	<div class="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 font-mono">
		<button
			class="bg-black/80 text-white px-3 py-1 rounded text-xs border border-white/20 hover:bg-white/10 transition-colors shadow-lg"
			onclick={() => (isOpen = !isOpen)}
		>
			{isOpen ? 'Close Debug' : 'Debug Log'}
			({logs.length})
		</button>

		{#if isOpen}
			<div
				transition:fade={{ duration: 150 }}
				class="bg-black/95 text-white p-4 rounded-lg w-[90vw] max-w-lg max-h-[60vh] overflow-y-auto border border-white/20 shadow-2xl text-[10px]"
			>
				<div class="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
					<span class="font-bold text-xs uppercase tracking-widest text-theme-primary"
						>Console Output</span
					>
					<div class="flex gap-2">
						<button
							class="bg-sky-900/30 text-sky-400 hover:bg-sky-800/50 hover:text-sky-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-sky-500/30 transition-colors"
							onclick={copyLogsToClipboard}
						>
							Copy All
						</button>
						<button
							class="bg-red-900/30 text-red-400 hover:bg-red-800/50 hover:text-red-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-red-500/30 transition-colors"
							onclick={() => debugStore.clear()}
						>
							Clear
						</button>
					</div>
				</div>
				<div class="flex flex-col gap-1">
					{#each logs as log, index (`${log.timestamp}-${index}`)}
						<div class="flex gap-2 border-b border-white/5 pb-1 last:border-0">
							<span class="text-gray-500 whitespace-nowrap">
								{new Date(log.timestamp).toLocaleTimeString()}
							</span>
							<span
								class="{log.level === 'error'
									? 'text-red-400 font-bold'
									: log.level === 'warn'
									? 'text-amber-400'
									: 'text-green-400'} uppercase w-10 shrink-0"
							>
								{log.level}
							</span>
							<span class="break-words flex-1 min-w-0">
								{log.message}
								{#if log.data}
									<div class="relative mt-1">
										<pre
											class="bg-white/5 p-2 rounded overflow-x-auto text-gray-300 max-h-32 text-[10px]"
											>{JSON.stringify(log.data, null, 2)}</pre
										>
										<button
											class="absolute top-1 right-1 bg-white/10 hover:bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded transition-colors"
											onclick={() => {
												try {
													navigator.clipboard.writeText(JSON.stringify(log.data, null, 2));
												} catch (e) {
													console.error('Failed to copy data', e);
												}
											}}
										>
											Copy JSON
										</button>
									</div>
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}