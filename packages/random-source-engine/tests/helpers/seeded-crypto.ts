/**
 * Deterministic CryptoProvider for tests.
 *
 * DiceEngine draws from `getRandomValues` with rejection sampling, so seeding
 * it makes distribution checks (SC-008) and cycle-safety checks (SC-006)
 * reproducible instead of flaky.
 */

/** xorshift128 — small, fast, and good enough to stand in for a CSPRNG here. */
export function seededCrypto(seed = 0x12345678) {
  let x = seed >>> 0 || 1;
  let y = 362436069;
  let z = 521288629;
  let w = 88675123;

  return {
    getRandomValues(arr: Uint32Array): Uint32Array {
      for (let i = 0; i < arr.length; i++) {
        const t = x ^ (x << 11);
        x = y;
        y = z;
        z = w;
        w = (w ^ (w >>> 19) ^ (t ^ (t >>> 8))) >>> 0;
        arr[i] = w;
      }
      return arr;
    },
  };
}

/** A provider that yields a fixed sequence, for pinning an exact selection. */
export function scriptedCrypto(values: number[]) {
  let i = 0;
  return {
    getRandomValues(arr: Uint32Array): Uint32Array {
      for (let n = 0; n < arr.length; n++) {
        arr[n] = values[i % values.length];
        i++;
      }
      return arr;
    },
  };
}
