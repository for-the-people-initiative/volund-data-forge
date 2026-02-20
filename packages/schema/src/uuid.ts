/**
 * UUID v7 generator — RFC 9562 compliant
 * Time-sortable UUIDs: first 48 bits = unix timestamp ms, rest = random
 */

import { randomBytes } from 'node:crypto';

export function generateUUIDv7(): string {
  const now = Date.now();

  // 16 bytes total
  const bytes = new Uint8Array(16);

  // Fill with random bytes first
  const rand = randomBytes(16);
  bytes.set(rand);

  // Bytes 0-5: unix_ts_ms (48 bits, big-endian)
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Byte 6: version 7 (high nibble) + rand_a (low nibble)
  bytes[6] = (0x70) | (bytes[6] & 0x0f);

  // Byte 8: variant 10xx (high 2 bits) + rand_b (low 6 bits)
  bytes[8] = (0x80) | (bytes[8] & 0x3f);

  // Format as UUID string
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
