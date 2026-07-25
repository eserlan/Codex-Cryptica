// The shared proxy runs on one free Workers AI allocation of 10,000 neurons a
// day, so the default has to be cheap before it is good. At 832x1216 this model
// costs roughly 100 neurons an image, about a hundred images a day for everyone
// using the proxy; Leonardo's Lucid Origin renders the same prompt far better
// and costs roughly 2,455, which is four. Lucid is the right choice on a user's
// own Cloudflare credentials, and the wrong default on a shared one.
export const DEFAULT_CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

export const DEFAULT_CUSTOM_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";
export const DEFAULT_CUSTOM_IMAGE_BASE_URL =
  "https://api.together.xyz/v1/images/generations";
