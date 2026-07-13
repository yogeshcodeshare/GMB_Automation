import type { HeadingNode, WebsiteAuditDetail } from "@/types";
import { auditReportMock } from "./audit-report";

/**
 * Typed mock of EP-014 `POST /api/website-audit` — the Manovedh fixture's
 * grexa.site findings, verbatim from the design prototype. Swapped for the
 * real route on Day 5.
 */

const headings: HeadingNode[] = [
  {
    level: 1,
    text: "मनोवेध हिप्नोक्लिनिक — संमोहन उपचार",
    skip_flag: false,
    children: [
      {
        level: 2,
        text: "आमच्या सेवा",
        skip_flag: false,
        children: [
          {
            level: 5,
            text: "संमोहन उपचार (Hypnotherapy)",
            skip_flag: true,
            children: [],
          },
          { level: 4, text: "NLP थेरपी", skip_flag: true, children: [] },
        ],
      },
      { level: 2, text: "आमच्याबद्दल", skip_flag: false, children: [] },
      {
        level: 3,
        text: "संपर्क",
        skip_flag: false,
        children: [
          { level: 6, text: "पत्ता व वेळा", skip_flag: true, children: [] },
        ],
      },
    ],
  },
];

export const websiteAuditMock: WebsiteAuditDetail = {
  // The audit-report mock's summary IS the EP-014 summary — single source.
  summary: auditReportMock.website!,
  nap: [
    {
      field: "name",
      gbp_value: "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार…)",
      website_value: "मनोवेध हिप्नोक्लिनिक",
      match: true,
    },
    {
      field: "address",
      gbp_value: "Somwar Peth, Karad 415110",
      website_value: "Somwar Peth, Karad 415110",
      match: true,
    },
    { field: "phone", gbp_value: null, website_value: null, match: false },
  ],
  title: {
    value:
      "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार, NLP, EFT थेरपी) - Hospital in Somwar Peth, Karad",
    has_category: true,
    has_city: true,
  },
  meta: {
    value:
      "मनोवेध हिप्नोक्लिनिकमध्ये संमोहन, NLP आणि EFT द्वारे उपचार केले जातात. आजच भेट द्या.",
    has_category: false,
    has_locality: false,
    ai_suggestions: [
      "कराडमधील विश्वासार्ह मानसिक आरोग्य क्लिनिक — संमोहन उपचार, NLP आणि EFT थेरपी. सोमवार पेठ, कराड. आजच अपॉइंटमेंट बुक करा.",
      "Trusted mental health & hypnotherapy clinic in Somwar Peth, Karad. Hypnosis, NLP and EFT therapy for stress, fear and habits. Book today.",
    ],
  },
  local_keywords: [
    {
      keyword: "Karad",
      found: true,
      snippets: [
        "…कराडमधील सर्वोत्तम संमोहन उपचार केंद्र…",
        "H2: आमच्या सेवा — कराड",
      ],
    },
    {
      keyword: "Somwar Peth",
      found: true,
      snippets: ["…पत्ता: सोमवार पेठ, कराड ४१५११०…"],
    },
  ],
  hours_match: auditReportMock.hours.map((h) => ({
    day: h.day,
    gbp: h.text,
    website: h.text,
    match: true,
  })),
  category_pages: [{ category: "Hospital", matched_page: null }],
  content_depth: { word_count: 633, band: "good" },
  spelling_issues: [
    { found: "Minde", suggested: "Mind", location: "Products section" },
  ],
  headings,
  heading_skips: ["H2→H5", "H2→H4", "H3→H6"],
  click_to_call: "not_applicable",
};

/**
 * CONTRACT GAP (raised in HANDOFF 13 Jul): the DSM wants mobile AND desktop
 * PSI gauges, but `WebsiteAuditSummary.psi_score` is mobile-only. Proposal:
 * add `psi_desktop: number | null`. Display-only mock until arbitrated.
 */
export const psiDesktopMock = 71;
