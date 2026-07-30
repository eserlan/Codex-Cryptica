import assert from "node:assert/strict";
import test from "node:test";
import { calculateNextVersion } from "./bump-web-version.mjs";

test("increments patch version by default", () => {
  assert.equal(calculateNextVersion("0.28.32", "patch"), "0.28.33");
});

test("increments minor version on minor bump", () => {
  assert.equal(calculateNextVersion("0.28.32", "minor"), "0.29.0");
});

test("increments major version on major bump", () => {
  assert.equal(calculateNextVersion("0.28.32", "major"), "1.0.0");
});

test("catches up to higher changelog version if top release in releases.json is higher", () => {
  assert.equal(calculateNextVersion("0.29.0", "minor", "0.31.0"), "0.31.0");
  assert.equal(calculateNextVersion("0.28.32", "patch", "0.31.0"), "0.31.0");
});

test("does not downgrade version if calculated next version is higher than changelog top version", () => {
  assert.equal(calculateNextVersion("0.31.0", "patch", "0.31.0"), "0.31.1");
});
