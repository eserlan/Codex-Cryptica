<script lang="ts">
	import "../app.css";
	import { aiService } from "$lib/services/ai";
	import VaultControls from "$lib/components/VaultControls.svelte";
	import SearchModal from "$lib/components/search/SearchModal.svelte";
	import OracleWindow from "$lib/components/oracle/OracleWindow.svelte";
	import SettingsModal from "$lib/components/settings/SettingsModal.svelte";
	import GuestLoginModal from "$lib/components/modals/GuestLoginModal.svelte";
	import TourOverlay from "$lib/components/help/TourOverlay.svelte";
	import { vault } from "$lib/stores/vault.svelte";
	import { graph } from "$lib/stores/graph.svelte";
	import { oracle } from "$lib/stores/oracle.svelte";
	import { timelineStore } from "$lib/stores/timeline.svelte";
	import { categories } from "$lib/stores/categories.svelte";
	import { searchStore } from "$lib/stores/search";
	import { helpStore } from "$stores/help.svelte";
	import { uiStore } from "$stores/ui.svelte";
	import { guestInfo } from "$lib/stores/guest";
	import { syncStats } from "$stores/sync-stats";
	import { cloudConfig } from "$stores/cloud-config";
	import { workerBridge } from "$lib/cloud-bridge/worker-bridge";
	import { MemoryAdapter } from "$lib/cloud-bridge/memory-adapter";
	import { P2PClientAdapter } from "$lib/cloud-bridge/p2p/client-adapter";
	import { PublicGDriveAdapter } from "$lib/cloud-bridge/google-drive/public-adapter";
	import { onMount } from "svelte";

	import { page } from "$app/state";
	import { base } from "$app/paths";
	let { children } = $props();

	const isPopup = $derived(page.url.pathname === `${base}/oracle`);
	const isLegalPage = $derived(
		page.url.pathname.includes("/privacy") ||
			page.url.pathname.includes("/terms"),
	);

	const shareId = $derived(page.url.searchParams.get("shareId"));
	let showGuestLogin = $state(false);

	const handleJoin = async (username: string) => {
		sessionStorage.setItem("guest_username", username);
		guestInfo.set({ username, joinedAt: new Date() }); // Updated
		showGuestLogin = false;

		console.log("[Layout] handleJoin called. ShareId:", shareId);

		// P2P Mode
		console.log("[Layout] P2P Mode detected. ID:", shareId);
		if (shareId?.startsWith("p2p-")) {
			const peerId = shareId.replace("p2p-", "");
			try {
				const adapter = new P2PClientAdapter(peerId);
				// P2P adapter handles its own initialization and connecting
				await vault.initGuest(adapter);
			} catch (err) {
				console.error("P2P Join Failed", err);
				vault.status = "error";
				vault.errorMessage =
					"Failed to connect to host. Make sure they are online!";
			}
			return;
		}

		// Google Drive Mode
		// Basic validation for GDrive ID (length and alphanumeric usually)
		if (!shareId || shareId.length < 20) {
			vault.status = "error";
			vault.errorMessage = "Malformed or invalid share link.";
			// Re-show login if malformed
			showGuestLogin = true;
			return;
		}

		const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
		if (!apiKey) {
			console.error("Missing VITE_GOOGLE_API_KEY in environment.");
			vault.status = "error";
			vault.errorMessage =
				"Configuration error: Guest Mode requires a VITE_GOOGLE_API_KEY. Please check your .env file.";
			return;
		}

		const publicAdapter = new PublicGDriveAdapter();
		const memoryAdapter = new MemoryAdapter();

		try {
			// Pre-fetch graph using public adapter
			const graph = await publicAdapter.fetchPublicFolder(
				shareId!,
				apiKey,
			);
			memoryAdapter.hydrate(graph);
			if (graph.deferredAssets) {
				memoryAdapter.setDeferredAssets(graph.deferredAssets);
			}
			await vault.initGuest(memoryAdapter);
		} catch (err) {
			console.error("Guest join failed", err);
			vault.status = "error";
			vault.errorMessage =
				err instanceof Error
					? err.message
					: "Unable to load shared vault.";
		}
	};

	onMount(() => {
		categories.init();
		helpStore.init();
		timelineStore.init();
		graph.init();
		if (shareId) {
			// Check if we already have a guest session
			const savedUser = sessionStorage.getItem("guest_username");
			if (savedUser) {
				handleJoin(savedUser);
			} else {
				showGuestLogin = true;
			}
		} else {
			// Standard Initialization
			vault
				.init()
				.then(() => {
					// Trigger onboarding for new users after vault has initialized
					if (
						!vault.rootHandle &&
						!helpStore.hasSeen("initial-onboarding") &&
						!(window as any).DISABLE_ONBOARDING
					) {
						helpStore.startTour("initial-onboarding");
					}
				})
				.catch((error) => {
					console.error("Vault initialization failed", error);
				});
		}

		const handleGlobalError = (event: ErrorEvent) => {
			// Ignore non-fatal script/asset load failures (common when offline)
			if (
				event.target instanceof HTMLScriptElement ||
				event.target instanceof HTMLLinkElement
			) {
				return;
			}

			const message = event.message || "";
			if (
				message.includes("Script error") ||
				message.includes("Load failed") ||
				message.includes("isHeadless") ||
				message.includes("notify") ||
				message.includes("INTERNET_DISCONNECTED") ||
				message.includes("Failed to fetch") ||
				message.includes("NetworkError")
			) {
				return;
			}

			console.error("[Fatal Error]", event);
			uiStore.setGlobalError(event.message, event.error?.stack);
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			const message = reason?.message || "";

			// Filter out common network errors that aren't fatal to the app logic
			if (
				message.includes("Failed to fetch") ||
				message.includes("NetworkError") ||
				message.includes("Load failed") ||
				message.includes("INTERNET_DISCONNECTED")
			) {
				return;
			}

			console.error("[Fatal Rejection]", event);
			uiStore.setGlobalError(
				message || "Unhandled Promise Rejection",
				reason?.stack,
			);
		};

		window.addEventListener("error", handleGlobalError);
		window.addEventListener("unhandledrejection", handleUnhandledRejection);

		// Expose for E2E testing
		if (import.meta.env.DEV || (window as any).__E2E__) {
			(window as any).searchStore = searchStore;
			(window as any).vault = vault;
			(window as any).graph = graph;
			(window as any).oracle = oracle;
			(window as any).aiService = aiService;
			(window as any).categories = categories;
			(window as any).uiStore = uiStore;
			(window as any).syncStats = syncStats;
			(window as any).cloudConfig = cloudConfig;
			(window as any).workerBridge = workerBridge;
		}

		return () => {
			window.removeEventListener("error", handleGlobalError);
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
		};
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
						data-testid="search-input"
					/>
				</div>
			</div>

			<div
				class="flex items-center gap-2 md:gap-4 shrink-0 order-2 md:order-3"
			>
				<VaultControls />
				<button
					class="w-8 h-8 flex items-center justify-center border transition-all {uiStore.showSettings &&
					uiStore.activeSettingsTab !== 'sync'
						? 'border-green-500 bg-green-900/10 text-green-500'
						: 'border-green-900/30 hover:border-green-500 text-green-900 hover:text-green-500'} relative"
					onclick={() => uiStore.toggleSettings("vault")}
					title="Application Settings"
					data-testid="settings-button"
				>
					<span
						class="w-5 h-5 {$syncStats.status === 'SCANNING' ||
						$syncStats.status === 'SYNCING'
							? 'icon-[lucide--zap] animate-pulse text-green-500'
							: 'icon-[lucide--settings]'}"
					></span>
					{#if $cloudConfig.enabled && $cloudConfig.connectedEmail && $syncStats.status === "IDLE"}
						<span
							class="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-black animate-pulse"
						></span>
					{/if}
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
		<TourOverlay />
	{/if}
</div>

{#if showGuestLogin}
	<GuestLoginModal onJoin={handleJoin} />
{/if}

{#if uiStore.globalError && !(window as any).DISABLE_ERROR_OVERLAY}
	<div
		class="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 text-red-500 font-mono"
	>
		<div
			class="max-w-2xl w-full border border-red-900 bg-red-950/20 p-8 rounded shadow-2xl relative"
		>
			<div
				class="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-red-500"
			></div>
			<div
				class="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-red-500"
			></div>

			<h2 class="text-2xl font-black mb-4 flex items-center gap-3">
				<span class="icon-[lucide--alert-triangle] w-8 h-8"></span>
				SYSTEM FAILURE
			</h2>
			<p class="text-red-400 mb-6 font-bold">
				{uiStore.globalError.message}
			</p>
			{#if uiStore.globalError.stack}
				<pre
					class="bg-black/50 p-4 rounded text-[10px] overflow-auto max-h-40 border border-red-900/30 mb-6">{uiStore
						.globalError.stack}</pre>
			{/if}
			<div class="flex gap-4">
				<button
					onclick={() => window.location.reload()}
					class="flex-1 py-3 bg-red-600 hover:bg-red-500 text-black font-bold rounded transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
				>
					REBOOT SYSTEM
				</button>
				<button
					onclick={() => uiStore.clearGlobalError()}
					class="px-6 py-3 border border-red-900 text-red-900 hover:text-red-500 hover:border-red-500 transition-colors"
				>
					IGNORE
				</button>
			</div>
		</div>
	</div>
{/if}
