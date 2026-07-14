import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditProgress,
  AuditScores,
  Business,
  BusinessCandidate,
} from "@/types";
import type {
  AuditInput,
  CompetitorSnapshot,
  NormalizedPost,
  NormalizedReview,
  WebsiteFindings,
} from "./input";
import { buildHoursDays } from "./hours";
import { buildNormalizedReviews } from "./reviews";
import {
  computePostStats,
  computePostTimeline,
  countLast30d,
  lastPostTs,
} from "./posts";
import { buildSnapshot } from "./pipeline";
import { finishProgress, initProgress, setStage } from "./progress";
import { insertAudit, insertScores, replacePosts, upsertReviews } from "./repo";

/**
 * UAT-2 — DEMO AUDIT MODE (EP-001 mode:"demo"). A deterministic synthetic
 * generator seeded from the searched name+city: fixture-shaped, plausible
 * values, ZERO vendor calls (no dataforseo import anywhere in this file),
 * works while dataforseo_live_enabled=false. Everything persists with
 * businesses.is_demo=true and snapshot.source="demo" so `npm run flush:demo`
 * cleans it and the UI can label it.
 */

// ---------- deterministic PRNG ----------

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoSeed(name: string, city: string): number {
  return fnv1a(`${name.trim().toLowerCase()}|${city.trim().toLowerCase()}`);
}

// ---------- vertical inference ----------

interface Vertical {
  key: string;
  primary: string;
  genericPrimary: string; // the flaw variant a weak profile shows
  secondary: string[];
  services: string[];
  competitors: string[];
  topics: string[];
}

const VERTICALS: Array<{ match: RegExp; v: Vertical }> = [
  {
    match: /dental|डेंटल|dent|दात/i,
    v: {
      key: "dental",
      primary: "Dental clinic",
      genericPrimary: "Clinic",
      secondary: ["Dentist", "Orthodontist"],
      services: ["Root canal", "Braces", "Teeth whitening", "Dental implants", "Scaling"],
      competitors: ["Smile Dental Studio", "City Dental Care", "Shree Dental Clinic"],
      topics: ["painless root canal", "braces offer"],
    },
  },
  {
    match: /hotel|हॉटेल|restaurant|रेस्टॉ|misal|मिसळ|khanaval|cafe|कॅफे/i,
    v: {
      key: "food",
      primary: "Maharashtrian restaurant",
      genericPrimary: "Restaurant",
      secondary: ["Family restaurant", "Veg restaurant"],
      services: ["Dine-in", "Takeaway", "Home delivery", "Catering"],
      competitors: ["Hotel Annapurna", "Sahyadri Bhojanalay", "Krishna Kata"],
      topics: ["weekend thali special", "misal morning batch"],
    },
  },
  {
    match: /salon|parlour|beauty|ब्युटी|makeup|hair/i,
    v: {
      key: "salon",
      primary: "Beauty salon",
      genericPrimary: "Shop",
      secondary: ["Bridal makeup artist", "Hair salon"],
      services: ["Haircut", "Facial", "Bridal makeup", "Waxing", "Hair spa"],
      competitors: ["Glamour Beauty Studio", "New Look Salon", "Radha Beauty Care"],
      topics: ["bridal season booking", "festive glow package"],
    },
  },
  {
    match: /class|coaching|academy|क्लासेस|अकॅडमी|tuition/i,
    v: {
      key: "coaching",
      primary: "Coaching center",
      genericPrimary: "School",
      secondary: ["Tutoring service", "Exam preparation center"],
      services: ["10th/12th coaching", "JEE/NEET foundation", "Spoken English"],
      competitors: ["Dnyandeep Classes", "Excel Academy", "Vidya Coaching"],
      topics: ["new batch admissions", "scholarship test"],
    },
  },
  {
    match: /clinic|क्लिनिक|hospital|हॉस्पिटल|हिप्नो|therap|डॉ|dr\.?\s/i,
    v: {
      key: "clinic",
      primary: "Medical clinic",
      genericPrimary: "Hospital",
      secondary: ["General practitioner"],
      services: ["Consultation", "Health checkup", "Vaccination"],
      competitors: ["Arogya Clinic", "LifeCare Hospital", "Shri Samarth Clinic"],
      topics: ["monsoon health camp", "senior citizen checkup"],
    },
  },
];

const DEFAULT_VERTICAL: Vertical = {
  key: "local",
  primary: "Business service",
  genericPrimary: "Store",
  secondary: [],
  services: ["Consultation", "Home service", "Annual maintenance"],
  competitors: ["Karad Traders", "Shivneri Services", "Om Sai Enterprises"],
  topics: ["festive offer", "new stock arrival"],
};

export function verticalFor(name: string): Vertical {
  return VERTICALS.find((entry) => entry.match.test(name))?.v ?? DEFAULT_VERTICAL;
}

// ---------- corpus ----------

const REVIEW_TEXTS = [
  "Khup chan anubhav ala. Nakki bhet dya.",
  "उत्तम सेवा आणि वेळेवर काम. धन्यवाद!",
  "Best experience, very professional staff.",
  "Chan service, parat yenar nakki.",
  "समाधानकारक अनुभव. किंमतही योग्य.",
  "Good work but waiting time jast hota.",
  "Great value for money, highly recommended.",
  "खूप छान! सगळ्यांनी एकदा नक्की भेट द्या.",
  "Thoda gardi hoti pan service chan milali.",
  "Excellent! Staff khup helpful ahe.",
  "ठीक आहे, अजून सुधारणा होऊ शकते.",
  "Superb quality, mast experience.",
];

const AUTHORS = [
  "Sandeep Patil",
  "Priya Kulkarni",
  "Rahul Jadhav",
  "स्नेहा देशमुख",
  "Amol Kadam",
  "Vaishnavi More",
  "Kiran Shinde",
  "सुनील पवार",
  "Pooja Salunkhe",
  "Nilesh Mane",
  "Asha Bhosale",
  "Vikram Chavan",
];

const POST_TEXTS = [
  "या आठवड्याची खास ऑफर — आजच भेट द्या!",
  "New services now available. Book your slot today.",
  "सणासुदीच्या शुभेच्छा! खास सवलत फक्त याच आठवड्यात.",
  "Customer appreciation week — thank you Karad!",
];

// ---------- the generator ----------

export interface DemoOpts {
  /** 0..1 profile quality — drives every deficit. Default derives from the seed. */
  quality?: number;
  /** Reference "today" for dates (deterministic in tests). */
  reference?: Date;
}

export function demoInputFor(
  name: string,
  city: string,
  opts: DemoOpts = {}
): AuditInput {
  const rng = mulberry32(demoSeed(name, city));
  const quality = opts.quality ?? 0.25 + rng() * 0.6;
  const reference = opts.reference ?? new Date();
  const refMs = reference.getTime();
  const vertical = verticalFor(name);
  const hash8 = demoSeed(name, city).toString(16).padStart(8, "0");
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "demo-business";

  const rating = Math.round((3.6 + quality * 1.3) * 10) / 10;
  const reviewsTotal = 8 + Math.floor(quality * 160 + rng() * 30);
  const hasPhone = rng() < 0.35 + quality * 0.6;
  const hasWebsite = rng() < 0.3 + quality * 0.6;
  const rented = hasWebsite && quality < 0.55;
  const genericCategory = quality < 0.5;
  const hasServices = quality >= 0.45;
  const hoursAnomaly = quality < 0.35;
  const phone = hasPhone
    ? `+91 9${Math.floor(rng() * 9)}${Math.floor(rng() * 90000000 + 10000000)}`.slice(0, 14)
    : null;
  const website = hasWebsite
    ? rented
      ? `https://${slug}.grexa.site/`
      : `https://${slug}.in/`
    : null;

  const hoursText = hoursAnomaly ? "12–9 am; 10 am–12 am" : "10 am–8 pm";
  const hours = buildHoursDays(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
      (day) => ({ day, text: day === "Sunday" && !hoursAnomaly ? "Closed" : hoursText })
    )
  );

  // ---- reviews (analyzed sample; displayed total can exceed it) ----
  const analyzed = Math.min(reviewsTotal, 12);
  const replyRateTarget = Math.round(quality * quality * 80);
  const items: NormalizedReview[] = Array.from({ length: analyzed }, (_, i) => {
    const monthsAgo = Math.floor((i / analyzed) * 22 + rng() * 2);
    const ts = new Date(refMs - monthsAgo * 30 * 86_400_000);
    const isLow = rng() > rating / 5.4;
    return {
      review_id: `demo-r${i + 1}-${hash8}`,
      rating: isLow ? (rng() < 0.5 ? 3 : 4) : 5,
      text: REVIEW_TEXTS[(demoSeed(name, city) + i * 7) % REVIEW_TEXTS.length],
      author: AUTHORS[(demoSeed(name, city) + i * 5) % AUTHORS.length],
      review_ts: ts.toISOString().slice(0, 10),
      approximated: monthsAgo > 12,
      replied: (i * 100) / analyzed < replyRateTarget,
      owner_reply: null,
      has_photos: rng() < quality * 0.3,
      author_review_count: 1 + Math.floor(rng() * 40),
      author_photo_count: Math.floor(rng() * 10),
      is_local_guide: rng() < 0.15,
    };
  });
  const reviews = buildNormalizedReviews(items, {
    reference,
    displayed_rating: rating,
    displayed_total: reviewsTotal,
  });

  // ---- posts ----
  const postCount = quality < 0.4 ? 1 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 8);
  const postGapDays = quality > 0.65 ? 9 : 70 + Math.floor(rng() * 120);
  const postItems: NormalizedPost[] = Array.from({ length: postCount }, (_, i) => {
    const text = POST_TEXTS[(demoSeed(name, city) + i * 3) % POST_TEXTS.length];
    return {
      post_ts: new Date(refMs - (i * postGapDays + 2) * 86_400_000).toISOString(),
      text,
      char_count: text.length,
      has_media: rng() < 0.6,
      media_type: rng() < 0.6 ? ("image" as const) : null,
      links: rng() < 0.2 ? 1 : 0,
    };
  });
  const posts = {
    stats: computePostStats(postItems),
    items: postItems,
    timeline: computePostTimeline(postItems),
    last_post_ts: lastPostTs(postItems),
    last_30d_count: countLast30d(postItems, reference),
  };

  // ---- website findings ----
  const psi = hasWebsite ? Math.round(30 + quality * 55 + rng() * 10) : null;
  const websiteFindings: WebsiteFindings | null = website
    ? {
        url: website,
        rented_subdomain: rented,
        provider: rented ? "grexa.site" : null,
        psi_score: psi,
        nap: [
          { field: "name", gbp_value: name, website_value: name, match: true },
          {
            field: "address",
            gbp_value: `${city} 4151${Math.floor(rng() * 90) + 10}`,
            website_value: quality > 0.4 ? `${city}` : null,
            match: quality > 0.4,
          },
          {
            field: "phone",
            gbp_value: phone,
            website_value: quality > 0.6 ? phone : null,
            match: Boolean(phone) && quality > 0.6,
          },
        ],
        title: {
          value: `${name} - ${vertical.primary} in ${city}`,
          has_category: quality > 0.45,
          has_city: quality > 0.35,
        },
        meta: {
          value: quality > 0.5 ? `${name}, ${city}.` : null,
          has_category: quality > 0.6,
          has_locality: quality > 0.6,
          ai_suggestions: [],
        },
        local_keywords: [
          { keyword: city, found: quality > 0.35, snippets: [`${name}, ${city}`] },
        ],
        hours_match: [],
        category_pages: [
          { category: vertical.primary, matched_page: quality > 0.7 ? "/services" : null },
        ],
        content_depth: {
          word_count: 150 + Math.floor(quality * 800),
          band:
            quality < 0.3 ? "thin" : quality < 0.5 ? "light" : quality < 0.75 ? "good" : "strong",
        },
        spelling_issues: [],
        headings: [],
        heading_skips: quality < 0.5 ? ["H2→H5"] : [],
        click_to_call: phone ? (quality > 0.55 ? "ok" : "missing") : "not_applicable",
      }
    : null;

  // ---- competitors ----
  const competitors: CompetitorSnapshot[] = vertical.competitors.map((compName, i) => ({
    name: `${compName}`,
    primary_category: vertical.primary,
    rating: Math.round((3.9 + rng() * 1.0) * 10) / 10,
    reviews_total: 20 + Math.floor(rng() * 250),
    distance_km: Math.round((0.4 + rng() * 4) * 10) / 10,
    photos: 10 + Math.floor(rng() * 80),
    cid: `demo-comp-${hash8}-${i}`,
    place_id: null,
  }));

  return {
    profile: {
      name,
      address: `${123 + Math.floor(rng() * 800)}, ${city}, Maharashtra 4151${Math.floor(rng() * 90) + 10}`,
      phone,
      website,
      claimed: rng() < 0.9,
      lat: 17.2935 + (rng() - 0.5) * 0.02,
      lng: 74.1794 + (rng() - 0.5) * 0.02,
      rating,
      reviews_total: reviewsTotal,
      place_id: `demo-${hash8}`,
      cid: String(demoSeed(name, city)) + String(demoSeed(city, name)),
      kg_id: null,
      profile_id: null,
      categories: {
        primary: genericCategory ? vertical.genericPrimary : vertical.primary,
        secondary: quality > 0.6 ? vertical.secondary : [],
      },
      services: hasServices ? vertical.services : [],
      attributes: quality > 0.4 ? { Payments: ["UPI", "Cash"] } : {},
      hours,
      photos_total: Math.floor(quality * 60),
      description: quality > 0.55 ? `${name} — ${vertical.primary}, ${city}.` : null,
      city,
    },
    reviews,
    posts,
    website: websiteFindings,
    competitors,
  };
}

/** P2 candidate cards in demo mode — synthetic, clearly labeled. */
export function demoCandidatesFor(name: string, city: string): BusinessCandidate[] {
  const rng = mulberry32(demoSeed(name, city));
  const variants = [name, `${name} ${city}`, `New ${name}`];
  return variants.map((candidateName, i) => {
    const input = demoSeed(candidateName, city).toString(16).padStart(8, "0");
    return {
      name: candidateName,
      address: `${100 + Math.floor(rng() * 900)}, ${city}, Maharashtra · demo data`,
      place_id: `demo-${input}-${i}`,
      cid: String(demoSeed(candidateName, city)),
      rating: Math.round((3.7 + rng() * 1.2) * 10) / 10,
      reviews_total: 10 + Math.floor(rng() * 180),
    };
  });
}

// ---------- the demo pipeline (staged, persisted, ₹0) ----------

export interface DemoAuditDeps {
  db: SupabaseClient;
  now?: () => Date;
}

export interface StartedDemoAudit {
  audit_id: string;
  business_id: string;
  done: Promise<AuditProgress>;
}

export async function startDemoAudit(
  deps: DemoAuditDeps,
  req: { business_id?: string; name?: string; city?: string }
): Promise<StartedDemoAudit> {
  const { db } = deps;
  const now = deps.now ?? (() => new Date());

  // Resolve the target name+city (existing business or fresh search).
  let name = req.name?.trim() ?? "";
  let city = req.city?.trim() ?? "";
  let existing: Business | null = null;
  if (req.business_id) {
    const { data, error } = await db
      .from("businesses")
      .select()
      .eq("id", req.business_id)
      .maybeSingle();
    if (error) throw new Error(`business read failed: ${error.message}`);
    if (!data) throw new Error("NOT_FOUND");
    existing = data as Business;
    name = existing.name;
    city = existing.city ?? "Karad";
  }
  if (!name || !city) throw new Error("VALIDATION:demo mode needs name + city");

  const input = demoInputFor(name, city, { reference: now() });

  // Business row: is_demo=true so flush:demo cleans it (raw column — the
  // Business type gains it via contract later; extra keys are accepted).
  let businessId: string;
  if (existing) {
    businessId = existing.id;
    await db
      .from("businesses")
      .update({
        is_demo: true,
        lat: input.profile.lat,
        lng: input.profile.lng,
        website: existing.website ?? input.profile.website,
      })
      .eq("id", businessId);
  } else {
    const { data, error } = await db
      .from("businesses")
      .upsert(
        {
          name,
          city,
          place_id: input.profile.place_id,
          cid: input.profile.cid,
          lat: input.profile.lat,
          lng: input.profile.lng,
          website: input.profile.website,
          is_demo: true,
        },
        { onConflict: "place_id" }
      )
      .select()
      .single();
    if (error) throw new Error(`business insert failed: ${error.message}`);
    businessId = (data as Business).id;
  }

  const startedAt = now().toISOString();
  const auditId = await insertAudit(db, businessId, {
    source: "demo",
    started_at: startedAt,
    progress: initProgress("pending"),
  });
  initProgress(auditId);

  const done = (async (): Promise<AuditProgress> => {
    // Staged for the P2 UI — instant but honest about what exists.
    setStage(auditId, "profile", "synthetic profile generated");
    setStage(auditId, "reviews", `${input.reviews?.items.length ?? 0} reviews synthesized`);
    setStage(auditId, "posts", `${input.posts?.stats.total ?? 0} posts synthesized`);
    setStage(auditId, "competitors", `${input.competitors.length} competitors`);
    setStage(auditId, "website", input.website ? "website synthesized" : "no website");
    setStage(auditId, "scoring");
    const progress = finishProgress(auditId, "done", "demo data — no vendor calls, ₹0");
    const snapshot = buildSnapshot(input, {
      source: "demo",
      auditedAt: startedAt,
      progress,
    });
    await insertScores(db, auditId, snapshot.scores as Omit<AuditScores, "audit_id">);
    await db
      .from("audits")
      .update({ raw_snapshot: snapshot })
      .eq("id", auditId);
    if (input.reviews) await upsertReviews(db, businessId, input.reviews.items);
    if (input.posts) await replacePosts(db, businessId, input.posts.items);
    return progress;
  })().catch((e: unknown) => {
    const p = finishProgress(
      auditId,
      "failed",
      e instanceof Error ? e.message : "demo audit failed"
    );
    return p;
  });

  return { audit_id: auditId, business_id: businessId, done };
}
