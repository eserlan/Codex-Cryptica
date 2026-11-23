declare module "*.svelte?retry" {
  import type { Component } from "svelte";
  const component: Component<any>;
  export default component;
}

declare module "#lib/services/seo/generator-engine.js?retry" {
  export const generatorEngine: typeof import("#lib/services/seo/generator-engine.js").generatorEngine;
}
