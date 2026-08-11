import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 2 * 1024 * 1024;

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^\[|\]$/g, '');
}

function privateIpv4(ip: string) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) return true;
  const [a, b, c] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function mappedIpv4(ip: string) {
  if (!ip.startsWith('::ffff:')) return undefined;
  const tail = ip.slice('::ffff:'.length);
  if (tail.includes('.')) return tail;
  const parts = tail.split(':');
  if (parts.length !== 2) return undefined;
  const hi = Number.parseInt(parts[0], 16);
  const lo = Number.parseInt(parts[1], 16);
  if (!Number.isInteger(hi) || !Number.isInteger(lo) || hi < 0 || hi > 0xffff || lo < 0 || lo > 0xffff) return undefined;
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
}

function privateIp(raw: string) {
  const ip = normalizeHost(raw);
  if (isIP(ip) === 4) return privateIpv4(ip);
  if (isIP(ip) !== 6) return true;

  const mapped = mappedIpv4(ip);
  if (mapped) return privateIpv4(mapped);

  // Unspecified, loopback, unique-local, link-local and multicast/non-public IPv6.
  if (ip === '::' || ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(ip)) return true;
  if (ip.startsWith('ff')) return true;
  return false;
}

export async function validateRegulatorySourceUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Regulatory source monitoring requires HTTPS.');

  const host = normalizeHost(url.hostname);
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Private/local regulatory source hosts are blocked.');
  }

  if (process.env.NODE_ENV === 'production') {
    const allowed = String(process.env.OPSIQO_REGULATORY_SOURCE_HOSTS || '')
      .split(',')
      .map((v) => normalizeHost(v))
      .filter(Boolean);
    if (!allowed.length) throw new Error('Production regulatory source monitoring requires OPSIQO_REGULATORY_SOURCE_HOSTS.');
    if (!allowed.includes(host)) throw new Error('Regulatory source host is not in the production allow-list.');
  }

  if (isIP(host) && privateIp(host)) throw new Error('Private IP regulatory source hosts are blocked.');
  if (!isIP(host)) {
    const rows = await lookup(host, { all: true, verbatim: true });
    if (!rows.length || rows.some((r: { address: string }) => privateIp(r.address))) {
      throw new Error('Regulatory source resolved to a blocked address.');
    }
  }
  return url;
}

function normalizeContent(text: string, contentType: string) {
  let out = text;
  if (contentType.includes('html')) {
    out = out
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

export async function fetchRegulatorySnapshot(raw: string) {
  let url = await validateRegulatorySourceUrl(raw);
  for (let redirects = 0; redirects < 4; redirects++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'OPSIQO-Regulatory-Monitor/2.4 (+human-review-required)',
          accept: 'text/html,text/plain,application/json;q=0.8,*/*;q=0.2',
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error(`Regulatory source returned redirect ${res.status} without Location.`);
        url = await validateRegulatorySourceUrl(new URL(location, url).toString());
        continue;
      }
      if (!res.ok) throw new Error(`Regulatory source returned HTTP ${res.status}.`);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!/(text\/html|text\/plain|application\/json|application\/ld\+json)/.test(contentType)) {
        throw new Error(`Unsupported regulatory source content type: ${contentType || 'unknown'}.`);
      }
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > MAX_BYTES) throw new Error('Regulatory source exceeds the 2 MB monitoring limit.');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) throw new Error('Regulatory source exceeds the 2 MB monitoring limit.');
      const normalized = normalizeContent(buf.toString('utf8'), contentType);
      if (normalized.length < 50) throw new Error('Regulatory source content is too small to fingerprint reliably.');
      return {
        url: url.toString(),
        fingerprint: createHash('sha256').update(normalized).digest('hex'),
        etag: res.headers.get('etag') || undefined,
        lastModified: res.headers.get('last-modified') || undefined,
        bytes: buf.length,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Regulatory source exceeded the redirect limit.');
}
