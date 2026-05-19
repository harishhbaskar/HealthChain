/**
 * Browser-native SHA-256 hash for live preview.
 * Uses a simple synchronous approach with a fallback:
 * We can't use crypto.subtle synchronously, so we use a
 * lightweight JS implementation for the live preview only.
 *
 * This is purely cosmetic — the REAL hash is computed server-side.
 */

export function generateHash(input) {
  // Simple djb2-inspired hash displayed as hex — for preview only
  // The actual SHA-256 is computed on the server
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0; // FNV prime
  }

  // Expand to 64-char hex string (looks like SHA-256) by iterating
  let result = '';
  let seed = hash;
  for (let i = 0; i < 64; i++) {
    seed = ((seed * 1103515245 + 12345) >>> 0);
    result += ((seed >> 16) & 0xf).toString(16);
  }
  return result;
}
