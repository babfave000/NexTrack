// src/db/uuid.ts
/**
 * Client-side UUID generation.
 *
 * UUIDs are generated locally so that records can be created while offline and
 * still carry a stable, globally unique cloud identity. Numeric Dexie primary
 * keys remain local compatibility aliases and must never be used as cloud
 * identities.
 */

/**
 * Generate an RFC 4122 version 4 UUID.
 *
 * Prefers `crypto.randomUUID`, which is available in every browser that
 * supports the service worker and IndexedDB features this app already relies
 * on. Falls back to `crypto.getRandomValues` and then to `Math.random` so that
 * record creation never fails outright (for example in a non-secure context
 * where `crypto.randomUUID` is not exposed).
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }

  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}

/**
 * Return `value` when it is already a non-empty string, otherwise generate a
 * new UUID. Used by migrations and table hooks so that identity assignment is
 * idempotent and safe to repeat after an interrupted upgrade.
 */
export function ensureUuid(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : generateUuid();
}
