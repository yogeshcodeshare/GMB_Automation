import type { RubricKey, RubricRow, TopFixes } from "@/types";

/**
 * Deterministic bilingual top-5 fixes from the worst rubric rows.
 * M1 placeholder texts — M3's ai.service redrafts these (draft-only,
 * approved=false) but the audit report never ships empty.
 */

const FIX_TEXT: Record<RubricKey, { en: string; mr: string }> = {
  claimed: {
    en: "Claim the Business Profile — nothing else works until you own it",
    mr: "आधी बिझनेस प्रोफाइल क्लेम करा — त्याशिवाय पुढचे काहीही करता येत नाही",
  },
  category: {
    en: "Replace the generic primary category with the most specific one Google offers",
    mr: "जेनेरिक प्राथमिक कॅटेगरी बदलून Google मधील सर्वात अचूक कॅटेगरी निवडा",
  },
  completeness: {
    en: "Complete the profile: add phone number, services list and correct the opening hours",
    mr: "प्रोफाइल पूर्ण करा: फोन नंबर जोडा, सेवांची यादी भरा आणि वेळा दुरुस्त करा",
  },
  photos: {
    en: "Upload 10+ fresh photos this month (front, inside, team, work results)",
    mr: "या महिन्यात १०+ नवीन फोटो टाका (दर्शनी भाग, आतील भाग, टीम, कामाचे निकाल)",
  },
  reviews_count: {
    en: "Start a review machine: ask every happy customer with a QR card / WhatsApp link",
    mr: "रिव्ह्यू मशीन सुरू करा: प्रत्येक समाधानी ग्राहकाला QR कार्ड / WhatsApp लिंकने विचारा",
  },
  reviews_velocity: {
    en: "Aim for 4+ new reviews every month — recency matters as much as the count",
    mr: "दर महिन्याला ४+ नवीन रिव्ह्यू मिळवा — संख्येइतकीच ताजेपणालाही किंमत आहे",
  },
  reply_rate: {
    en: "Reply to every review, old ones included — replies are a ranking signal",
    mr: "प्रत्येक रिव्ह्यूला उत्तर द्या, जुन्यांनाही — उत्तरे हा रँकिंग सिग्नल आहे",
  },
  posts: {
    en: "Publish at least 4 GBP posts a month (offers, tips, festivals)",
    mr: "महिन्याला किमान ४ GBP पोस्ट करा (ऑफर, टिप्स, सण-उत्सव)",
  },
  website: {
    en: "Move the website from the rented subdomain to your own domain and fix the basics",
    mr: "वेबसाइट भाड्याच्या सबडोमेनवरून स्वतःच्या डोमेनवर हलवा आणि मूलभूत गोष्टी दुरुस्त करा",
  },
  nap: {
    en: "Make name, address and phone identical on GBP and the website",
    mr: "GBP आणि वेबसाइटवर नाव, पत्ता, फोन अगदी एकसारखे ठेवा",
  },
};

const STATUS_WEIGHT = { fail: 2, warn: 1, pass: 0 } as const;

export function buildTopFixes(rubric: RubricRow[], top = 5): TopFixes[] {
  const worst = [...rubric]
    .filter((r) => r.status !== "pass")
    .sort(
      (a, b) =>
        STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status] ||
        b.max - b.points - (a.max - a.points)
    )
    .slice(0, top);

  return [
    { lang: "en", items: worst.map((r) => FIX_TEXT[r.key].en) },
    { lang: "mr", items: worst.map((r) => FIX_TEXT[r.key].mr) },
  ];
}
