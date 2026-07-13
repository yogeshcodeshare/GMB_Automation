import type { CategoryIntel, Language } from "@/types";

/**
 * Typed mocks for P8 AI Tools (EP-005 outputs + EP-015 category intel).
 * Texts are the design prototype's fixtures; each text tool carries TWO
 * variants so Regenerate visibly changes output. Swapped for the real
 * OpenRouter chain on Day 5 (flag OFF — Groq quota is shared).
 */

export const aiUsageMock = { used: 2, limit: 1000 };

type TextTool = "post" | "reply" | "desc" | "fb";

/** Variant 0 = prototype text · variant 1 = regenerate alternate. */
export const aiTextOutputsMock: Record<
  TextTool,
  Record<Language, [string, string]>
> = {
  post: {
    mr: [
      "परीक्षेचा काळ जवळ आला आहे!\n\nदहावी-बारावीच्या विद्यार्थ्यांसाठी खास — एकाग्रता आणि आत्मविश्वास वाढवणारे संमोहन सत्र. या आठवड्यात पहिले सत्र फक्त ₹499.\n\nआजच अपॉइंटमेंट बुक करा — मनोवेध हिप्नोक्लिनिक, सोमवार पेठ, कराड.",
      "विद्यार्थी मित्रांनो, परीक्षा जवळ आली!\n\nअभ्यासात एकाग्रता वाढवण्यासाठी संमोहन सत्र — दहावी-बारावीच्या विद्यार्थ्यांसाठी या आठवड्यात खास ₹499 मध्ये.\n\nवेळ ठरवण्यासाठी आजच कॉल करा — मनोवेध हिप्नोक्लिनिक, कराड.",
    ],
    en: [
      "Exam season is here!\n\nSpecial hypnotherapy sessions for Std 10–12 students — build focus and confidence. First session this week just ₹499.\n\nBook today — Manovedh Hypnoclinic, Somwar Peth, Karad.",
      "Exams around the corner?\n\nHelp your child focus and stay calm with a guided hypnotherapy session — student special this week at ₹499.\n\nCall now to book — Manovedh Hypnoclinic, Karad.",
    ],
    hinglish: [
      "Exam season aali!\n\n10vi–12vi students sathi special hypnosis session — focus ani confidence vadhva. Ya week first session fakt ₹499.\n\nAajach book kara — Manovedh Hypnoclinic, Karad.",
      "Exams javal aalya! Focus hot nahi?\n\nStudents sathi guided hypnosis session — ya week special ₹499 madhe. Seats limited!\n\nCall karun slot book kara — Manovedh Hypnoclinic, Karad.",
    ],
  },
  reply: {
    mr: [
      "धन्यवाद! तुमच्या विश्वासाबद्दल मनःपूर्वक आभार. काळजी घ्या 🙏",
      "खूप खूप धन्यवाद! तुमच्या शब्दांमुळे आम्हाला प्रोत्साहन मिळते. पुन्हा भेटूया 🙏",
    ],
    en: [
      "Thank you so much for your kind words! Wishing you continued good health.",
      "So glad to hear this — thank you for trusting us. Take care!",
    ],
    hinglish: [
      "Thank you! Tumchya vishwasabaddal manapasun aabhar 🙏",
      "Khup khup dhanyavad! Tumcha feedback amchyasathi khup important aahe 🙏",
    ],
  },
  desc: {
    mr: [
      "कराडमधील विश्वासार्ह संमोहन उपचार केंद्र. संमोहन, NLP आणि EFT थेरपीद्वारे तणाव, भीती आणि सवयींवर उपाय. अपॉइंटमेंटसाठी आजच कॉल करा.",
      "सोमवार पेठ, कराड येथील मानसिक आरोग्य क्लिनिक — संमोहन उपचार, NLP आणि EFT थेरपी. तणावमुक्त जीवनासाठी आजच अपॉइंटमेंट घ्या.",
    ],
    en: [
      "Trusted hypnotherapy centre in Karad. Hypnosis, NLP and EFT therapy for stress, fears and habits. Call today for an appointment.",
      "Mental health & hypnotherapy clinic in Somwar Peth, Karad — hypnosis, NLP and EFT for stress, anxiety and habits. Book your session today.",
    ],
    hinglish: [
      "Karad madhil trusted hypnotherapy centre. Stress, bhiti ani savayinsathi hypnosis, NLP ani EFT upchar. Aajach call kara.",
      "Somwar Peth, Karad cha mental health clinic — hypnosis, NLP ani EFT therapy. Tension-free life sathi aajach appointment ghya.",
    ],
  },
  fb: {
    mr: [
      "मित्रांनो, परीक्षेचा ताण जाणवतोय? संमोहन उपचाराने एकाग्रता वाढते — विद्यार्थ्यांसाठी या आठवड्यात विशेष सवलत. DM करा किंवा कॉल करा!",
      "परीक्षेच्या काळात मुलांचा ताण वाढतोय का? संमोहन सत्राने एकाग्रता आणि आत्मविश्वास दोन्ही वाढतात — या आठवड्यात विद्यार्थी सवलत. आजच संपर्क करा!",
    ],
    en: [
      "Feeling exam stress? Hypnotherapy genuinely helps with focus — special student offer this week. DM or call us!",
      "Parents — exam pressure building at home? A guided hypnotherapy session builds focus and calm. Student discount this week. Message us!",
    ],
    hinglish: [
      "Exam cha tension? Hypnosis ne focus vadhto — students sathi ya week special offer. DM kara kinva call kara!",
      "Exam stress? Ekagrata vadhvaychi aahe? Hypnotherapy try kara — ya week students sathi discount. Message kara aajach!",
    ],
  },
};

/** Q&A pairs per language (hinglish falls back to English, per prototype). */
export const aiQaPairsMock: Record<
  "mr" | "en",
  Array<{ q: string; a: string }>
> = {
  mr: [
    { q: "सत्र किती वेळ चालते?", a: "साधारण ४५–६० मिनिटे. पहिल्या भेटीत समस्येची सविस्तर चर्चा होते." },
    { q: "संमोहन सुरक्षित आहे का?", a: "हो, पूर्णपणे सुरक्षित — तुम्ही संपूर्ण वेळ जागरूक आणि नियंत्रणात असता." },
    { q: "किती सत्रांमध्ये फरक जाणवतो?", a: "बहुतेक समस्यांमध्ये ३–५ सत्रांत लक्षणीय फरक दिसतो." },
    { q: "अपॉइंटमेंट आवश्यक आहे का?", a: "हो — कृपया फोन करून वेळ निश्चित करा." },
    { q: "ऑनलाइन सत्र मिळते का?", a: "हो, व्हिडिओ कॉलवर सत्र उपलब्ध आहे." },
  ],
  en: [
    { q: "How long is a session?", a: "About 45–60 minutes; the first visit includes a detailed discussion." },
    { q: "Is hypnotherapy safe?", a: "Completely — you stay aware and in control throughout." },
    { q: "How many sessions until I see change?", a: "Most concerns show clear improvement within 3–5 sessions." },
    { q: "Do I need an appointment?", a: "Yes — please call to fix a time." },
    { q: "Are online sessions available?", a: "Yes, sessions are available over video call." },
  ],
};

/** Description tab: current profile description + keyword chips. */
export const descriptionBeforeMock = "Hospital in Karad. Contact for appointment.";
export const descriptionKeywordsMock = [
  "hypnotherapy",
  "Karad",
  "NLP",
  "mental health",
  "संमोहन",
];

/** Media-inbox thumbs per business (connected/manager clients only). */
export const mediaInboxMock: Record<
  string,
  Array<{ file: string; bg: string }>
> = {
  "biz-sahyadri": [
    { file: "room-12.jpg", bg: "#DCE7DD" },
    { file: "thali.jpg", bg: "#EDE4D1" },
    { file: "lobby.jpg", bg: "#DDE3EA" },
  ],
  "biz-shree-dental": [
    { file: "chair.jpg", bg: "#DDE3EA" },
    { file: "reception.jpg", bg: "#EDE4D1" },
    { file: "team.jpg", bg: "#DCE7DD" },
  ],
  "biz-patil-coaching": [
    { file: "notice-board.jpg", bg: "#EDE4D1" },
    { file: "toppers.jpg", bg: "#DCE7DD" },
  ],
};

/** Festival creative: greeting per festival + the 3 template palettes. */
export const festivalGreetingsMock: Record<string, string> = {
  "Ganesh Chaturthi": "गणेश चतुर्थीच्या\nहार्दिक शुभेच्छा",
  Diwali: "शुभ दीपावली",
  "15 August": "स्वातंत्र्यदिनाच्या\nहार्दिक शुभेच्छा",
};

export interface CreativeTemplate {
  outer: string;
  inner: string;
  title: string;
  accent: string;
  sub: string;
  logo: string;
}
export const creativeTemplatesMock: CreativeTemplate[] = [
  { outer: "#14201C", inner: "1.5px solid #E39A2D", title: "#FFFFFF", accent: "#E39A2D", sub: "rgba(255,255,255,0.50)", logo: "rgba(255,255,255,0.40)" },
  { outer: "#1B2321", inner: "4px double #E39A2D", title: "#FFFFFF", accent: "#E39A2D", sub: "rgba(255,255,255,0.50)", logo: "rgba(255,255,255,0.40)" },
  { outer: "#FBF7EF", inner: "1.5px solid #0F5C48", title: "#14201C", accent: "#0F5C48", sub: "rgba(20,32,28,0.55)", logo: "rgba(20,32,28,0.35)" },
];

/** EP-015 category intel (base view) + drill-in sets + services per category. */
export const categoryIntelMock: CategoryIntel = {
  current: [
    "Hospital · primary ✗",
    "Hypnotherapy service",
    "Psychotherapist",
    "Alternative medicine practitioner",
  ],
  related: [
    { category: "Mental health clinic", monthly_volume: 165000, used_by_top_performers: 4 },
    { category: "Counsellor", monthly_volume: 301000, used_by_top_performers: 3 },
    { category: "Family counselor", monthly_volume: 22200, used_by_top_performers: 2 },
    { category: "Marriage counsellor", monthly_volume: 3600, used_by_top_performers: 1 },
    { category: "Hypnotherapy service", monthly_volume: null, used_by_top_performers: 4 },
    { category: "Psychotherapist", monthly_volume: null, used_by_top_performers: 2 },
    { category: "Addiction treatment center", monthly_volume: null, used_by_top_performers: 1 },
  ],
  related_services: [
    "Individual therapy",
    "Counseling services",
    "Anxiety treatment",
    "Depression treatment",
  ],
  trends_compare_url:
    "https://trends.google.com/trends/explore?q=mental%20health%20clinic,counsellor&geo=IN",
};

/** Drill-in: related categories for a tapped category (prototype CATREL). */
export const categoryDrillMock: Record<
  string,
  CategoryIntel["related"]
> = {
  "Mental health clinic": [
    { category: "Counsellor", monthly_volume: 301000, used_by_top_performers: 3 },
    { category: "Psychiatrist", monthly_volume: 198000, used_by_top_performers: 2 },
    { category: "Mental health service", monthly_volume: 74000, used_by_top_performers: 2 },
    { category: "Family counselor", monthly_volume: 22200, used_by_top_performers: 1 },
    { category: "Addiction treatment center", monthly_volume: null, used_by_top_performers: 1 },
  ],
  Counsellor: [
    { category: "Mental health clinic", monthly_volume: 165000, used_by_top_performers: 4 },
    { category: "Psychologist", monthly_volume: 246000, used_by_top_performers: 2 },
    { category: "Life coach", monthly_volume: 88000, used_by_top_performers: 1 },
    { category: "Family counselor", monthly_volume: 22200, used_by_top_performers: 1 },
    { category: "Psychotherapist", monthly_volume: null, used_by_top_performers: 2 },
  ],
};

export const categoryServicesMock: Record<string, string[]> = {
  Counsellor: [
    "Individual therapy",
    "Couples counselling",
    "Career counselling",
    "Stress management",
  ],
};

/** "301k"-style volume badge. */
export function formatVolume(v: number | null): string | null {
  if (v === null) return null;
  return v >= 1000
    ? `${Math.round(v / 100) / 10}k`.replace(".0k", "k")
    : `${v}`;
}

/** Seed history rows (TB-007 ai_outputs) shown under every tab. */
export const aiHistoryMock = [
  {
    id: "hist-1",
    type: "GBP POST",
    text: "परीक्षेचा काळ जवळ आला आहे! दहावी-बारावीच्या विद्यार्थ्यांसाठी…",
    date: "10 Jul",
    lang: "mr" as Language,
    approved: true,
  },
  {
    id: "hist-2",
    type: "REPLY",
    text: "धन्यवाद संदीपजी! तुमच्या विश्वासाबद्दल मनःपूर्वक आभार…",
    date: "09 Jul",
    lang: "mr" as Language,
    approved: true,
  },
  {
    id: "hist-3",
    type: "DESCRIPTION",
    text: "Pure-veg family restaurant on the Pune–Bengaluru highway…",
    date: "05 Jul",
    lang: "en" as Language,
    approved: false,
  },
];
