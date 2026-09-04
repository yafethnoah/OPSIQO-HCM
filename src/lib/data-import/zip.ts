import { inflateRawSync } from 'node:zlib';

const MAX_ENTRIES = 500;
const MAX_ENTRY_UNCOMPRESSED = 8 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED = 40 * 1024 * 1024;
const MAX_RATIO = 250;

function u16(b: Buffer, o: number) { return b.readUInt16LE(o); }
function u32(b: Buffer, o: number) { return b.readUInt32LE(o); }

export interface SafeZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  encrypted: boolean;
}

function safeName(name: string) {
  const normalized = name.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('../') || normalized.startsWith('..') || normalized.includes('/../')) {
    throw new Error(`Unsafe ZIP path: ${name}`);
  }
  return normalized;
}

export function listSafeZipEntries(buf: Buffer): SafeZipEntry[] {
  let eocd = -1;
  for (let i = Math.max(0, buf.length - 65557); i <= buf.length - 22; i++) {
    if (u32(buf, i) === 0x06054b50) eocd = i;
  }
  if (eocd < 0) throw new Error('Invalid ZIP container.');
  const total = u16(buf, eocd + 10);
  if (total > MAX_ENTRIES) throw new Error(`ZIP contains more than ${MAX_ENTRIES} entries.`);
  let offset = u32(buf, eocd + 16);
  let totalUncompressed = 0;
  const out: SafeZipEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (u32(buf, offset) !== 0x02014b50) throw new Error('Invalid ZIP central directory.');
    const flags = u16(buf, offset + 8);
    const method = u16(buf, offset + 10);
    const compressedSize = u32(buf, offset + 20);
    const uncompressedSize = u32(buf, offset + 24);
    const nameLength = u16(buf, offset + 28);
    const extraLength = u16(buf, offset + 30);
    const commentLength = u16(buf, offset + 32);
    const localOffset = u32(buf, offset + 42);
    const name = safeName(buf.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'));
    totalUncompressed += uncompressedSize;
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED) throw new Error(`ZIP entry exceeds the safe extraction limit: ${name}`);
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED) throw new Error('ZIP exceeds the total safe extraction limit.');
    if (compressedSize > 0 && uncompressedSize > Math.max(4096, compressedSize * MAX_RATIO)) throw new Error(`ZIP entry compression ratio is unsafe: ${name}`);
    out.push({ name, method, compressedSize, uncompressedSize, localOffset, encrypted: Boolean(flags & 1) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return out;
}

export function readSafeZipEntry(buf: Buffer, entry: SafeZipEntry): Buffer {
  if (entry.encrypted) throw new Error(`Encrypted ZIP entries are not supported: ${entry.name}`);
  if (entry.name.endsWith('/')) return Buffer.alloc(0);
  if (u32(buf, entry.localOffset) !== 0x04034b50) throw new Error(`Invalid ZIP local entry: ${entry.name}`);
  const nameLength = u16(buf, entry.localOffset + 26);
  const extraLength = u16(buf, entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = buf.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_UNCOMPRESSED } as any);
  throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}.`);
}
