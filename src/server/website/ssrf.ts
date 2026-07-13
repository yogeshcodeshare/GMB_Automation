import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * SEC-001 — SSRF guard for the website crawler (P0, blocking DoD).
 * The crawler fetches ARBITRARY URLs taken from Google Business Profiles, so:
 *  - http/https only (no file:, ftp:, gopher:, javascript:, …)
 *  - resolve-then-connect: DNS answers are validated INSIDE the connection
 *    path (undici connect lookup), so a rebinding hostname cannot pass a
 *    pre-check and then resolve privately at connect time
 *  - deny private / link-local / loopback / metadata / reserved ranges,
 *    IPv4 and IPv6, including IPv4-mapped IPv6
 *  - 10s timeout · 2 MB response cap · redirect depth ≤ 2, every hop
 *    re-validated exactly like the first URL
 */

export class SsrfBlockedError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(`Blocked by SSRF guard: ${message}`);
    this.name = "SsrfBlockedError";
  }
}

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 2;

// ---------- IP validation ----------

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const b = Number(p);
    if (!Number.isInteger(b) || b < 0 || b > 255) return null;
    n = n * 256 + b;
  }
  return n >>> 0;
}

const V4_DENY: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. 169.254.169.254 metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function deniedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable = deny
  return V4_DENY.some(([base, bits]) => {
    const baseInt = ipv4ToInt(base) as number;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (baseInt & mask);
  });
}

function deniedV6(ip: string): boolean {
  const lower = ip.toLowerCase().split("%")[0]; // strip zone index
  if (lower === "::" || lower === "::1") return true; // unspecified/loopback
  // IPv4-mapped / IPv4-translated / NAT64 — validate the embedded IPv4.
  const v4Embedded = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower) ??
    /^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (v4Embedded) return deniedV4(v4Embedded[1]);
  const firstGroup = lower.split(":")[0] || "0";
  const first = parseInt(firstGroup, 16);
  if (Number.isNaN(first)) return true;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/** True when connecting to this IP must be refused. */
export function isDeniedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return deniedV4(ip);
  if (family === 6) return deniedV6(ip);
  return true; // not an IP at all = deny
}

// ---------- URL validation (pre-connect fast path) ----------

export function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfBlockedError(`not a valid URL: ${raw.slice(0, 100)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError(`scheme ${url.protocol} not allowed`);
  }
  if (url.username || url.password) {
    throw new SsrfBlockedError("credentials in URL not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new SsrfBlockedError("localhost not allowed");
  }
  if (isIP(host) && isDeniedIp(host)) {
    throw new SsrfBlockedError(`IP ${host} is in a denied range`);
  }
  return url;
}

// ---------- resolve-then-connect ----------

export type LookupAll = (hostname: string) => Promise<string[]>;

const systemLookupAll: LookupAll = (hostname) =>
  new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) reject(err);
      else resolve(addresses.map((a) => a.address));
    });
  });

/** Throws unless EVERY resolved address is public (a mixed answer is an
 * attack, not a CDN). Returns the addresses for logging/tests. */
export async function resolvePublic(
  hostname: string,
  lookupAll: LookupAll = systemLookupAll
): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isDeniedIp(host)) {
      throw new SsrfBlockedError(`IP ${host} is in a denied range`);
    }
    return [host];
  }
  let addresses: string[];
  try {
    addresses = await lookupAll(host);
  } catch {
    throw new SsrfBlockedError(`DNS resolution failed for ${host}`);
  }
  if (addresses.length === 0) {
    throw new SsrfBlockedError(`DNS returned no addresses for ${host}`);
  }
  const bad = addresses.find((a) => isDeniedIp(a));
  if (bad) {
    throw new SsrfBlockedError(`${host} resolves to denied address ${bad}`);
  }
  return addresses;
}

/** Production dispatcher: undici Agent whose connect-time lookup re-validates
 * every DNS answer — the actual rebinding defense. */
function guardedAgent(): Agent {
  return new Agent({
    connect: {
      lookup(hostname, options, callback) {
        dnsLookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
          if (err) return callback(err, []);
          const list = Array.isArray(addresses) ? addresses : [addresses];
          const bad = list.find((a) => isDeniedIp(a.address));
          if (bad || list.length === 0) {
            return callback(
              new SsrfBlockedError(
                `${hostname} resolves to denied address ${bad?.address ?? "(none)"}`
              ),
              []
            );
          }
          callback(null, list);
        });
      },
    },
  });
}

// ---------- safeFetch ----------

export interface SafeFetchResult {
  status: number;
  final_url: string;
  content_type: string | null;
  body: string; // capped at maxBytes
  truncated: boolean;
}

export interface SafeFetchOpts {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Test seams — production uses undici fetch + the guarded agent. */
  fetchImpl?: (url: string, init: Record<string, unknown>) => Promise<Response>;
  lookupAll?: LookupAll;
}

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

export async function safeFetch(
  rawUrl: string,
  opts: SafeFetchOpts = {}
): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const agent = opts.fetchImpl ? null : guardedAgent();
  const doFetch =
    opts.fetchImpl ??
    ((url: string, init: Record<string, unknown>) =>
      undiciFetch(url, { ...init, dispatcher: agent! } as never) as unknown as Promise<Response>);

  try {
    let current = rawUrl;
    for (let hop = 0; ; hop++) {
      const url = assertAllowedUrl(current);
      // Belt (pre-check with the injected resolver) + braces (connect-time
      // lookup in the agent). Tests exercise the belt; prod gets both.
      await resolvePublic(url.hostname, opts.lookupAll);

      const res = await doFetch(url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent": "GMBSarathiAudit/1.0 (website audit; contact: founder)",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (REDIRECT_STATUS.has(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          throw new SsrfBlockedError("redirect without Location header");
        }
        if (hop >= maxRedirects) {
          throw new SsrfBlockedError(`too many redirects (> ${maxRedirects})`);
        }
        current = new URL(location, url).toString(); // re-validated next loop
        continue;
      }

      // Stream the body with a hard byte cap.
      let body = "";
      let truncated = false;
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > maxBytes) {
            body += decoder.decode(value.subarray(0, value.byteLength - (received - maxBytes)));
            truncated = true;
            await reader.cancel();
            break;
          }
          body += decoder.decode(value, { stream: true });
        }
      }

      return {
        status: res.status,
        final_url: url.toString(),
        content_type: res.headers.get("content-type"),
        body,
        truncated,
      };
    }
  } finally {
    if (agent) await agent.close().catch(() => undefined);
  }
}
