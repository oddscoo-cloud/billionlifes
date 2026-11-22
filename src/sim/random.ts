const uint32Range = 0x1_0000_0000;

/** Mulberry32 with a serializable unsigned 32-bit state. */
export function drawRandom(state: number): { value: number; state: number } {
  if (!Number.isInteger(state) || state < 0 || state >= uint32Range) {
    throw new RangeError('Expected an unsigned 32-bit random state');
  }

  const nextState = (state + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(nextState ^ (nextState >>> 15), nextState | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return {
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / uint32Range,
    state: nextState,
  };
}
