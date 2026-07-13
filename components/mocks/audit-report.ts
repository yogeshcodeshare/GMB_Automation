import type { AuditReport } from "@/types";
import { businessesMock } from "./businesses";

/**
 * Typed mock of EP-002 `GET /api/audit/:id` — the Manovedh acceptance fixture
 * (§1.3d / seed §2.9): 41/100 amber, rubric split 10/0/7/4/5/3/1/2/6/3, phone
 * missing, "Hospital" generic, services empty, 12–9 AM hours anomaly, reply
 * rate 6.67%, 7 posts / one per 293 days, NAP phone mismatch, grexa.site
 * rented subdomain. Every string matches the design prototype's P3 verbatim.
 * Swapped for the real route on Day 5.
 */

const manovedh = businessesMock[0];

/** EP-006 names the PDF server-side — mock mirrors "{short}_GMB_Audit_{score}.pdf". */
export const auditPdfNameMock = "मनोवेध_GMB_Audit_41.pdf";

const site = "https://manovedh.grexa.site";
const q = encodeURIComponent(`${manovedh.name} Karad`);
const pid = manovedh.place_id ?? "";

export const auditReportMock: AuditReport = {
  business: manovedh,
  audit: {
    id: "audit-manovedh-0807",
    business_id: manovedh.id,
    raw_snapshot: {
      kg_id: "/g/11h_x0y2mp",
      address: "Somwar Peth, Karad, Maharashtra 415110",
      rating: 4.9,
      reviews_total: 30,
      claimed: true,
      audited_at: "2026-07-08T09:12:00+05:30",
    },
    competitor_ids: [],
    created_at: "2026-07-08T09:12:00+05:30",
  },
  scores: {
    audit_id: "audit-manovedh-0807",
    total: 41,
    claimed: 10,
    category: 0,
    completeness: 7,
    photos: 4,
    reviews_count: 5,
    reviews_velocity: 3,
    reply_rate: 1,
    posts: 2,
    website: 6,
    nap: 3,
  },
  band: "amber",
  rubric: [
    {
      key: "claimed",
      label: "Profile claimed",
      status: "pass",
      points: 10,
      max: 10,
      reason: "Verified owner on Google",
    },
    {
      key: "category",
      label: "Primary category",
      status: "fail",
      points: 0,
      max: 15,
      reason: '"Hospital" is generic; competitors use "Mental health clinic"',
    },
    {
      key: "completeness",
      label: "Completeness",
      status: "fail",
      points: 7,
      max: 15,
      reason: "Phone missing · services empty · hours look wrong (12–9 AM)",
    },
    {
      key: "photos",
      label: "Photos",
      status: "warn",
      points: 4,
      max: 10,
      reason: "34 photos · 0 from reviews · top competitor has 120+",
    },
    {
      key: "reviews_count",
      label: "Reviews count",
      status: "warn",
      points: 5,
      max: 10,
      reason: "30 vs top competitor 91",
    },
    {
      key: "reviews_velocity",
      label: "Review velocity",
      status: "warn",
      points: 3,
      max: 8,
      reason: "1.2 reviews/month over the last 6 months",
    },
    {
      key: "reply_rate",
      label: "Owner reply rate",
      status: "fail",
      points: 1,
      max: 7,
      reason: "6.67% — 2 of 30 reviews answered",
    },
    {
      key: "posts",
      label: "Posts",
      status: "fail",
      points: 2,
      max: 10,
      reason: "7 posts ever — one per 293 days",
    },
    {
      key: "website",
      label: "Website",
      status: "warn",
      points: 6,
      max: 10,
      reason:
        "Rented subdomain (grexa.site) · meta description missing category/locality",
    },
    {
      key: "nap",
      label: "NAP consistency",
      status: "warn",
      points: 3,
      max: 5,
      reason: "Phone mismatch between website and profile",
    },
  ],
  sanity_flags: [
    {
      key: "phone_missing",
      severity: "fail",
      message: "No phone number on the profile — customers cannot call.",
    },
    {
      key: "services_empty",
      severity: "fail",
      message: "Services list is empty — Google doesn't know what you offer.",
    },
    {
      key: "hours_anomaly",
      severity: "warn",
      message:
        "Two overnight blocks (12:00 – 9:00 AM) look like entry errors.",
    },
    {
      key: "generic_category",
      severity: "fail",
      message: '"Hospital" is generic — competitors use "Mental health clinic".',
    },
    {
      key: "rented_subdomain",
      severity: "warn",
      message: "Website lives on a rented subdomain (grexa.site).",
    },
    {
      key: "nap_mismatch",
      severity: "warn",
      message: "Phone differs between the website and the profile.",
    },
  ],
  hours: [
    { day: "Mon", text: "10:00 AM – 8:00 PM", anomaly: false },
    { day: "Tue", text: "10:00 AM – 8:00 PM", anomaly: false },
    { day: "Wed", text: "12:00 – 9:00 AM", anomaly: true },
    { day: "Thu", text: "10:00 AM – 8:00 PM", anomaly: false },
    { day: "Fri", text: "12:00 – 9:00 AM", anomaly: true },
    { day: "Sat", text: "10:00 AM – 2:00 PM", anomaly: false },
    { day: "Sun", text: "Closed", anomaly: false },
  ],
  categories: {
    primary: "Hospital",
    secondary: [
      "Hypnotherapy service",
      "Psychotherapist",
      "Alternative medicine practitioner",
    ],
    primary_flagged: true,
  },
  attributes: {
    "Service options": [
      "Appointment required ✓",
      "Onsite services ✓",
      "Online consultations ✓",
    ],
  },
  links_pack: [
    {
      group: "google",
      links: [
        {
          label: "Review request",
          url: `https://search.google.com/local/writereview?placeid=${pid}`,
        },
        {
          label: "All reviews",
          url: `https://search.google.com/local/reviews?placeid=${pid}`,
        },
        { label: "Knowledge panel", url: `https://www.google.com/search?q=${q}` },
        {
          label: "Posts feed",
          url: `https://www.google.com/search?q=${q}&tbm=lcl`,
        },
        { label: "Products", url: `https://www.google.com/search?q=${q}#products` },
        { label: "Q&A", url: `https://www.google.com/search?q=${q}#qa` },
        {
          label: "Same-address GMBs",
          url: `https://www.google.com/search?q=${encodeURIComponent('"Somwar Peth, Karad"')}`,
        },
        {
          label: "Same-domain GMBs",
          url: `https://www.google.com/search?q=${encodeURIComponent("site:grexa.site")}`,
        },
      ],
    },
    {
      group: "maps",
      links: [
        { label: "Apple Maps", url: `https://maps.apple.com/?q=${q}` },
        { label: "Bing Maps", url: `https://www.bing.com/maps?q=${q}` },
        { label: "HERE WeGo", url: `https://wego.here.com/search/${q}` },
        {
          label: "Facebook Places",
          url: `https://www.facebook.com/search/places/?q=${q}`,
        },
        { label: "Yelp", url: `https://www.yelp.com/search?find_desc=${q}` },
      ],
    },
    {
      group: "marketing",
      links: [
        {
          label: "Ads Transparency",
          url: `https://adstransparency.google.com/?query=${q}`,
        },
        {
          label: "FB Ad Library",
          url: `https://www.facebook.com/ads/library/?q=${q}`,
        },
        {
          label: "Google Trends",
          url: "https://trends.google.com/trends/explore?q=hypnotherapy%20karad",
        },
      ],
    },
    {
      group: "website",
      links: [
        {
          label: "site: all",
          url: `https://www.google.com/search?q=site:manovedh.grexa.site`,
        },
        {
          label: "site: past week",
          url: `https://www.google.com/search?q=site:manovedh.grexa.site&tbs=qdr:w`,
        },
        {
          label: "site: 6 months",
          url: `https://www.google.com/search?q=site:manovedh.grexa.site&tbs=qdr:m6`,
        },
        {
          label: "PageSpeed",
          url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site)}`,
        },
        {
          label: "Rich results",
          url: `https://search.google.com/test/rich-results?url=${encodeURIComponent(site)}`,
        },
        { label: "robots.txt", url: `${site}/robots.txt` },
        { label: "sitemap.xml", url: `${site}/sitemap.xml` },
        {
          label: "OG preview",
          url: `https://www.opengraph.xyz/url/${encodeURIComponent(site)}`,
        },
        { label: "WHOIS", url: "https://who.is/whois/grexa.site" },
        {
          label: "BuiltWith",
          url: "https://builtwith.com/manovedh.grexa.site",
        },
        {
          label: "Wayback",
          url: "https://web.archive.org/web/*/manovedh.grexa.site",
        },
      ],
    },
  ],
  top_fixes: [
    {
      lang: "mr",
      items: [
        "प्राथमिक कॅटेगरी 'Hospital' बदलून 'Mental health clinic' करा — रँक होणारे सर्व स्पर्धक हीच वापरतात.",
        "प्रोफाइलवर फोन नंबर लगेच जोडा — ग्राहक सध्या कॉल करूच शकत नाहीत.",
        "रिकामा Services विभाग भरा — संमोहन उपचार, NLP, EFT प्रत्येक सेवा स्वतंत्र जोडा.",
        'वेळा दुरुस्त करा — "12–9 AM" ही नोंद चुकीची दिसते; खऱ्या वेळा टाका.',
        "दर आठवड्याला किमान १ पोस्ट करा — २९३ दिवसांत १ पोस्ट म्हणजे Google ला व्यवसाय निष्क्रिय वाटतो.",
      ],
    },
    {
      lang: "en",
      items: [
        "Change primary category from 'Hospital' to 'Mental health clinic' — every ranking competitor uses it.",
        "Add the phone number now — customers currently have no way to call.",
        "Fill the empty Services list — add Hypnotherapy, NLP and EFT as separate services.",
        'Fix opening hours — the "12–9 AM" blocks look like an entry error.',
        "Post at least weekly — one post every 293 days reads as an inactive business to Google.",
      ],
    },
  ],
  review_stats: {
    avg_rating: 4.9,
    total: 30,
    reply_rate_pct: 6.67,
    velocity_per_month_6m: 1.2,
    velocity_per_month_1y: 1.4,
    with_photos: 0,
    textless: 0,
    local_guides: 1,
    avg_reviews_per_reviewer: 9.87,
    last_30d: 1,
    last_6m: 7,
    last_1y: 15,
  },
  post_stats: {
    total: 7,
    days_per_post: 293,
    avg_chars: 171,
    avg_words: 26.4,
    with_image: 4,
    with_link: 1,
    with_video: 0,
  },
  website: {
    id: 1,
    business_id: manovedh.id,
    url: site,
    psi_score: 62,
    title_ok: true,
    meta_ok: false,
    h1_ok: true,
    schema_ok: false,
    nap_match: false,
    city_kw: false,
    rented_subdomain: true,
    provider: "grexa.site",
    checked_at: "2026-07-08T09:14:00+05:30",
  },
  competitors: [
    {
      business_id: manovedh.id,
      name: "मनोवेध हिप्नोक्लिनिक",
      distance_km: null,
      primary_category: "Hospital",
      rating: 4.9,
      reviews_total: 30,
      velocity_6m: 1.2,
      reply_rate_pct: 7,
      photos: 34,
      services_count: 0,
      is_target: true,
    },
    {
      business_id: null,
      name: "Avani Hypnotism & Wellness",
      distance_km: 0.4,
      primary_category: "Hypnotherapy service",
      rating: 4.7,
      reviews_total: 18,
      velocity_6m: 0.8,
      reply_rate_pct: 22,
      photos: 14,
      services_count: 6,
      is_target: false,
    },
    {
      business_id: null,
      name: "Hypnotherapy Siddhivinayak Ngr",
      distance_km: 1.1,
      primary_category: "Mental health clinic",
      rating: 4.8,
      reviews_total: 44,
      velocity_6m: 2.5,
      reply_rate_pct: 81,
      photos: 52,
      services_count: 11,
      is_target: false,
    },
    {
      business_id: null,
      name: "Hypno Healling Clinic",
      distance_km: 2.3,
      primary_category: "Hypnotherapy service",
      rating: 4.6,
      reviews_total: 27,
      velocity_6m: 1.1,
      reply_rate_pct: 35,
      photos: 21,
      services_count: 4,
      is_target: false,
    },
  ],
};
