/// <reference types="gapi" />
/// <reference types="gapi.auth2" />
/// <reference types="gapi.client.drive" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
  // eslint-disable-next-line no-var
  var gapi: typeof import("gapi");
}

export { };
