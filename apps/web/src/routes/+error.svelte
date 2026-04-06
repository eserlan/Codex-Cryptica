<script>
    import { page } from "$app/stores";
    import { base } from "$app/paths";
</script>

<div
    class="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center"
>
    <h1 class="text-4xl font-bold text-red-600 mb-4">{$page.status}</h1>
    <p class="text-xl text-gray-700">
        {$page.error?.message || "Unknown error"}
    </p>
    <a
        href="{base}/"
        class="mt-8 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
        Return Home
    </a>
</div>
