import { describe, expect, it } from "vitest";
import {
  assertAllowedUrl,
  isDeniedIp,
  resolvePublic,
  safeFetch,
  SsrfBlockedError,
} from "@/server/website/ssrf";

/** SEC-001 — every deny case gets its own assertion (blocking DoD). */

describe("SSRF guard — IP deny list", () => {
  const denied = [
    // brief-mandated ranges
    ["10.0.0.1", "10.0.0.0/8"],
    ["10.255.255.255", "10.0.0.0/8 upper edge"],
    ["172.16.0.1", "172.16.0.0/12 lower edge"],
    ["172.31.255.254", "172.16.0.0/12 upper edge"],
    ["192.168.1.1", "192.168.0.0/16"],
    ["127.0.0.1", "loopback"],
    ["127.8.9.10", "loopback /8 (not just .0.0.1)"],
    ["169.254.1.1", "link-local"],
    ["169.254.169.254", "cloud metadata endpoint"],
    ["::1", "IPv6 loopback"],
    ["fc00::1", "fc00::/7 ULA"],
    ["fdff:ffff::1", "fc00::/7 upper half (fd00)"],
    // additional hardening
    ["0.0.0.0", "unspecified v4"],
    ["0.1.2.3", "0.0.0.0/8"],
    ["100.64.0.1", "CGNAT 100.64/10"],
    ["192.0.0.170", "IETF 192.0.0.0/24"],
    ["198.18.0.1", "benchmarking 198.18/15"],
    ["224.0.0.251", "multicast"],
    ["255.255.255.255", "broadcast"],
    ["::", "IPv6 unspecified"],
    ["fe80::1", "IPv6 link-local fe80::/10"],
    ["fe80::1%eth0", "link-local with zone index"],
    ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
    ["::ffff:10.1.2.3", "IPv4-mapped private"],
    ["64:ff9b::10.0.0.1", "NAT64-embedded private"],
  ] as const;

  for (const [ip, label] of denied) {
    it(`denies ${ip} (${label})`, () => {
      expect(isDeniedIp(ip)).toBe(true);
    });
  }

  const allowed = [
    "8.8.8.8",
    "1.1.1.1",
    "142.250.183.14",
    "172.15.255.255", // just below 172.16/12
    "172.32.0.1", // just above 172.16/12
    "100.63.255.255", // below CGNAT
    "9.255.255.255", // below 10/8
    "11.0.0.1", // above 10/8
    "2606:4700::1111", // public IPv6
    "::ffff:8.8.8.8", // IPv4-mapped public
  ];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => {
      expect(isDeniedIp(ip)).toBe(false);
    });
  }

  it("denies garbage that is not an IP", () => {
    expect(isDeniedIp("not-an-ip")).toBe(true);
  });
});

describe("SSRF guard — URL validation", () => {
  const badSchemes = ["file:///etc/passwd", "ftp://example.com/x", "gopher://example.com", "javascript:alert(1)"];
  for (const url of badSchemes) {
    it(`rejects scheme: ${url.split(":")[0]}:`, () => {
      expect(() => assertAllowedUrl(url)).toThrow(SsrfBlockedError);
    });
  }

  it("rejects localhost and *.localhost", () => {
    expect(() => assertAllowedUrl("http://localhost/x")).toThrow(SsrfBlockedError);
    expect(() => assertAllowedUrl("http://api.localhost/x")).toThrow(SsrfBlockedError);
  });

  it("rejects literal private IPs in the URL", () => {
    expect(() => assertAllowedUrl("http://169.254.169.254/latest/meta-data/")).toThrow(SsrfBlockedError);
    expect(() => assertAllowedUrl("http://[::1]:8080/")).toThrow(SsrfBlockedError);
  });

  it("rejects credentials in the URL", () => {
    expect(() => assertAllowedUrl("http://user:pass@example.com/")).toThrow(SsrfBlockedError);
  });

  it("accepts a normal https URL", () => {
    expect(assertAllowedUrl("https://nlp-eft.grexa.site/").hostname).toBe("nlp-eft.grexa.site");
  });
});

describe("SSRF guard — resolve-then-connect", () => {
  it("denies a hostname resolving to a private address", async () => {
    await expect(
      resolvePublic("evil.example", async () => ["10.0.0.5"])
    ).rejects.toThrow(SsrfBlockedError);
  });

  it("denies a MIXED public+private answer (rebinding/round-robin)", async () => {
    await expect(
      resolvePublic("evil.example", async () => ["93.184.216.34", "192.168.0.10"])
    ).rejects.toThrow(SsrfBlockedError);
  });

  it("denies empty and failing DNS", async () => {
    await expect(resolvePublic("nx.example", async () => [])).rejects.toThrow(SsrfBlockedError);
    await expect(
      resolvePublic("err.example", async () => {
        throw new Error("ENOTFOUND");
      })
    ).rejects.toThrow(SsrfBlockedError);
  });

  it("allows all-public answers", async () => {
    await expect(
      resolvePublic("ok.example", async () => ["93.184.216.34", "2606:2800:220:1::1"])
    ).resolves.toHaveLength(2);
  });
});

// ---------- safeFetch behaviour (mocked transport) ----------

function htmlResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

const PUBLIC_DNS = async () => ["93.184.216.34"];

describe("SSRF guard — safeFetch", () => {
  it("follows ≤2 redirects, re-validating every hop", async () => {
    const calls: string[] = [];
    const result = await safeFetch("http://a.example/", {
      lookupAll: PUBLIC_DNS,
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === "http://a.example/") {
          return htmlResponse("", 301, { location: "https://b.example/x" });
        }
        if (url === "https://b.example/x") {
          return htmlResponse("", 302, { location: "/final" });
        }
        return htmlResponse("<title>ok</title>");
      },
    });
    expect(calls).toEqual([
      "http://a.example/",
      "https://b.example/x",
      "https://b.example/final", // relative Location resolved against hop 2
    ]);
    expect(result.status).toBe(200);
    expect(result.final_url).toBe("https://b.example/final");
  });

  it("blocks a redirect INTO a private target (per-hop re-validation)", async () => {
    await expect(
      safeFetch("http://a.example/", {
        lookupAll: PUBLIC_DNS,
        fetchImpl: async () =>
          htmlResponse("", 302, { location: "http://169.254.169.254/latest/" }),
      })
    ).rejects.toThrow(SsrfBlockedError);
  });

  it("blocks a redirect to a hostname that resolves privately", async () => {
    await expect(
      safeFetch("http://a.example/", {
        lookupAll: async (host) =>
          host === "a.example" ? ["93.184.216.34"] : ["192.168.7.7"],
        fetchImpl: async (url) =>
          url === "http://a.example/"
            ? htmlResponse("", 302, { location: "http://internal.example/" })
            : htmlResponse("should never fetch"),
      })
    ).rejects.toThrow(/denied address 192\.168\.7\.7/);
  });

  it("throws after more than 2 redirects", async () => {
    let n = 0;
    await expect(
      safeFetch("http://a.example/", {
        lookupAll: PUBLIC_DNS,
        fetchImpl: async () =>
          htmlResponse("", 302, { location: `http://a.example/${++n}` }),
      })
    ).rejects.toThrow(/too many redirects/);
  });

  it("caps the response body and flags truncation", async () => {
    const big = "x".repeat(10_000);
    const result = await safeFetch("http://a.example/", {
      lookupAll: PUBLIC_DNS,
      maxBytes: 1_000,
      fetchImpl: async () => htmlResponse(big),
    });
    expect(result.truncated).toBe(true);
    expect(result.body.length).toBeLessThanOrEqual(1_000);
  });

  it("passes an abort signal with the 10s default budget", async () => {
    let seenSignal: unknown = null;
    await safeFetch("http://a.example/", {
      lookupAll: PUBLIC_DNS,
      fetchImpl: async (_url, init) => {
        seenSignal = init.signal;
        return htmlResponse("ok");
      },
    });
    expect(seenSignal).toBeInstanceOf(AbortSignal);
  });

  it("timeout aborts the fetch (fake slow server)", async () => {
    await expect(
      safeFetch("http://a.example/", {
        lookupAll: PUBLIC_DNS,
        timeoutMs: 20,
        fetchImpl: (_url, init) =>
          new Promise((_resolve, reject) => {
            (init.signal as AbortSignal).addEventListener("abort", () =>
              reject(new Error("aborted"))
            );
          }),
      })
    ).rejects.toThrow(/aborted/);
  });
});
