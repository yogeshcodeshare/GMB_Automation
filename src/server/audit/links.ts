import type { LinkPackGroup, LinkPackItem } from "@/types";
import type { NormalizedProfile } from "./input";

/**
 * MS1-T09 — link-generator pack (~25 templated links, §1.3d). Zero API cost:
 * everything derives from IDs the audit already holds. Templates mirror the
 * GMB Everywhere export in fixtures/BasicAudit.md. Links whose inputs are
 * missing (no kg_id, no website…) are silently skipped.
 */

function domainOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname;
  } catch {
    return null;
  }
}

function originOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).origin;
  } catch {
    return null;
  }
}

export function buildLinkPack(profile: NormalizedProfile): LinkPackGroup[] {
  const e = encodeURIComponent;
  const { place_id, cid, kg_id, name, address, lat, lng } = profile;
  const category = profile.categories.primary;
  const domain = domainOf(profile.website);
  const origin = originOf(profile.website);
  const url = profile.website;

  const google: Array<LinkPackItem | null> = [
    place_id
      ? { label: "Review list", url: `https://search.google.com/local/reviews?placeid=${e(place_id)}` }
      : null,
    place_id
      ? { label: "Review request link", url: `https://search.google.com/local/writereview?placeid=${e(place_id)}` }
      : null,
    kg_id
      ? { label: "Knowledge panel", url: `https://www.google.com/search?kgmid=${e(kg_id)}` }
      : null,
    kg_id
      ? { label: "GBP posts", url: `https://www.google.com/search?kgmid=${e(kg_id)}&uact=5#lpstate=pid:-1` }
      : null,
    kg_id
      ? { label: "Questions & answers", url: `https://www.google.com/search?kgmid=${e(kg_id)}&uact=5#lpqa=d,2` }
      : null,
    kg_id
      ? { label: "Products", url: `https://www.google.com/search?kgmid=${e(kg_id)}#lpc=lpc` }
      : null,
    { label: "Services listing", url: `https://www.google.com/localservices/prolist?src=2&q=${e(name)}` },
    address
      ? { label: "Other GBPs at this address", url: `https://www.google.com/maps/place/${e(address)}` }
      : null,
    domain
      ? { label: "GBPs sharing this domain", url: `https://www.google.com/search?q=${e(`"${domain}"`)}&tbm=lcl` }
      : null,
    place_id
      ? { label: "Maps (place id)", url: `https://www.google.com/maps/place/?q=place_id:${e(place_id)}` }
      : null,
    cid
      ? { label: "Maps (CID)", url: `https://www.google.com/maps/place/?cid=${e(cid)}` }
      : null,
  ];

  const hasPin = lat !== null && lng !== null;
  const maps: Array<LinkPackItem | null> = [
    hasPin
      ? { label: "Apple Maps listing", url: `https://maps.apple.com/?q=${e(name)}&near=${lat},${lng}` }
      : null,
    hasPin && category
      ? { label: "Apple Maps competitors", url: `https://maps.apple.com/?q=${e(category)}&near=${lat},${lng}` }
      : null,
    hasPin
      ? { label: "Bing Maps listing", url: `https://www.bing.com/maps?q=${e(name)}&cp=${lat}~${lng}` }
      : null,
    hasPin && category
      ? { label: "Bing Maps competitors", url: `https://www.bing.com/maps?q=${e(category)}&cp=${lat}~${lng}` }
      : null,
    hasPin
      ? { label: "HERE WeGo map", url: `https://wego.here.com/?map=${lat},${lng},17,normal` }
      : null,
    { label: "Facebook Places search", url: `https://www.facebook.com/search/places/?q=${e(name)}` },
    { label: "Yelp search", url: `https://www.yelp.com/search?find_desc=${e(name)}` },
  ];

  const marketing: Array<LinkPackItem | null> = [
    domain
      ? { label: "Google Ads run by business", url: `https://adstransparency.google.com/?region=anywhere&domain=${e(domain)}` }
      : null,
    domain
      ? { label: "Meta ads run by business", url: `https://www.facebook.com/ads/library/?ad_type=all&country=ALL&q=${e(domain)}` }
      : null,
    category
      ? { label: "Google Trends for category", url: `https://trends.google.com/trends/explore?geo=IN&q=${e(category)}` }
      : null,
  ];

  const website: Array<LinkPackItem | null> = [
    domain
      ? { label: "Pages indexed by Google", url: `https://www.google.com/search?q=site%3A${e(domain)}` }
      : null,
    url
      ? { label: "PageSpeed Insights", url: `https://developers.google.com/speed/pagespeed/insights/?url=${e(url)}` }
      : null,
    url
      ? { label: "Rich results test", url: `https://search.google.com/test/rich-results?url=${e(url)}` }
      : null,
    origin ? { label: "robots.txt", url: `${origin}/robots.txt` } : null,
    origin ? { label: "sitemap.xml", url: `${origin}/sitemap.xml` } : null,
    url ? { label: "Open Graph preview", url: `https://metatags.io/?url=${e(url)}` } : null,
    domain
      ? { label: "Website history (Wayback)", url: `https://web.archive.org/web/*/${domain}` }
      : null,
  ];

  const groups: LinkPackGroup[] = [
    { group: "google", links: google.filter((l): l is LinkPackItem => l !== null) },
    { group: "maps", links: maps.filter((l): l is LinkPackItem => l !== null) },
    { group: "marketing", links: marketing.filter((l): l is LinkPackItem => l !== null) },
    { group: "website", links: website.filter((l): l is LinkPackItem => l !== null) },
  ];
  return groups.filter((g) => g.links.length > 0);
}
