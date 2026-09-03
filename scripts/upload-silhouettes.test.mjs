import assert from "node:assert/strict";
import test from "node:test";
import { validateSilhouetteSvg } from "./upload-silhouettes.mjs";

const good =
  '<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M0 0h1v1H0z"/></svg>';

test("accepts artwork that a canvas can decode and tint", () => {
  assert.deepEqual(validateSilhouetteSvg(good), []);
});

test("rejects a repeated fill, which makes the SVG invalid XML", () => {
  // The HTML parser forgives this; an SVG loaded as an image refuses to decode
  // and the graph node paints with no glyph at all.
  const svg = good.replace("<path fill=", '<path fill="currentColor" fill=');

  assert.deepEqual(validateSilhouetteSvg(svg), [
    "has two fill attributes on one element",
  ]);
});

test("rejects artwork with no intrinsic size", () => {
  // Cytoscape samples the image using its own width/height, so without them a
  // corner gets stretched across the node.
  const svg = good.replace(' width="512" height="512"', "");

  assert.deepEqual(validateSilhouetteSvg(svg), [
    "declares width/height undefinedxundefined, viewBox says 512x512",
  ]);
});

test("rejects a size that disagrees with the viewBox", () => {
  const svg = good.replace('width="512"', 'width="256"');

  assert.deepEqual(validateSilhouetteSvg(svg), [
    "declares width/height 256x512, viewBox says 512x512",
  ]);
});

test("rejects artwork that cannot be tinted", () => {
  const svg = good.replace('fill="currentColor"', 'fill="black"');

  assert.deepEqual(validateSilhouetteSvg(svg), [
    "paints no currentColor, so it cannot be tinted",
    "has a hardcoded black fill that overrides currentColor",
  ]);
});

test("rejects a file that is not an SVG at all", () => {
  assert.deepEqual(validateSilhouetteSvg("<html>nope</html>"), [
    "does not start with an <svg> element",
  ]);
});
