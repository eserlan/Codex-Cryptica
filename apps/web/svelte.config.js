import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Using adapter-static to generate a fully static site suitable for GitHub Pages (no SSR, only prerendered assets).
		// GitHub Pages serves static files only, so adapter-static builds the site as plain HTML/CSS/JS; the fallback index.html supports SPA routing.
		// See https://svelte.dev/docs/kit/adapters for more information about adapter-static and other deployment targets.
		adapter: adapter({
			fallback: 'index.html',
			strict: false
		}),
		alias: {
			'$stores': 'src/lib/stores',
			'$workers': 'src/workers'
		},
		paths: {
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;
