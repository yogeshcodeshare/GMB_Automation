-- ============================================================
-- GMB Sarathi — M0 seed data per docs/ERD.md §2.9
-- 6 demo businesses (incl. the Manovedh fixture), 1 full fixture
-- audit (scores/reviews/posts/website), 3 grid scans × 25 points,
-- settings row, 1 active optimization sprint + 23 fix tasks.
-- Fixed UUIDs so tests and docs can reference rows.
-- NOTE: spend_ledger is NOT seeded — it is the real spend record;
-- fake rows would eat into the real daily cap.
-- ============================================================

-- ---------- TB-011 settings ----------
insert into public.settings (id, daily_spend_cap_usd, public_daily_limit, per_ip_limit, model_chain)
values (1, 1.00, 50, 3,
  '["groq/llama-3.3-70b-versatile","openrouter/meta-llama/llama-3.3-70b-instruct:free","openrouter/google/gemma-3-27b-it:free"]'::jsonb)
on conflict (id) do update set
  daily_spend_cap_usd = excluded.daily_spend_cap_usd,
  public_daily_limit  = excluded.public_daily_limit,
  per_ip_limit        = excluded.per_ip_limit,
  model_chain         = excluded.model_chain;

-- ---------- TB-001 businesses (6, per §2.9) ----------
insert into public.businesses
  (id, name, city, place_id, cid, lat, lng, website, is_client, gbp_location_id, plan, connection_status, owner_name, owner_whatsapp)
values
  ('11111111-1111-4111-8111-111111111111', 'मनोवेध हिप्नोक्लिनिक', 'Karad',
   'ChIJI1BROTaCwTsROZLPMoOo_64', '12609982763107324473', 17.293499, 74.17943009999999,
   'https://nlp-eft.grexa.site/', false, null, null, 'none', null, null),
  ('22222222-2222-4222-8222-222222222222', 'Hotel Sahyadri Veg', 'Karad',
   'demo-place-sahyadri', 'demo-cid-sahyadri', 17.2851, 74.1900,
   'https://hotelsahyadriveg.example.in', true, 'locations/demo-sahyadri',
   '{"base":"gmb_boost","addons":["content"]}'::jsonb, 'oauth', 'Suresh Kadam', '+919000000022'),
  ('33333333-3333-4333-8333-333333333333', 'श्री डेंटल केअर', 'Karad',
   'demo-place-shree-dental', 'demo-cid-shree-dental', 17.2905, 74.1822,
   'https://shreedentalkarad.example.in', true, 'locations/demo-shree-dental',
   '{"base":"gmb_boost","addons":["whatsapp"]}'::jsonb, 'oauth', 'Dr. Snehal Kulkarni', '+919000000033'),
  ('44444444-4444-4444-8444-444444444444', 'Patil Coaching Classes', 'Karad',
   'demo-place-patil-coaching', 'demo-cid-patil-coaching', 17.2960, 74.1751,
   null, true, null,
   '{"base":"gmb_boost","addons":[]}'::jsonb, 'manager', 'Vikram Patil', '+919000000044'),
  ('55555555-5555-4555-8555-555555555555', 'कृष्णा मिसळ हाऊस', 'Karad',
   'demo-place-krishna-misal', 'demo-cid-krishna-misal', 17.2889, 74.1867,
   null, false, null, null, 'none', null, null),
  ('66666666-6666-4666-8666-666666666666', 'Elegance Beauty Salon', 'Karad',
   'demo-place-elegance', 'demo-cid-elegance', 17.2922, 74.1810,
   'https://elegancekarad.example.in', false, null, null, 'none', null, null)
on conflict (id) do nothing;

-- ---------- TB-002 audits ----------
-- Full fixture audit for मनोवेध (raw_snapshot distilled from fixtures/*.md),
-- minimal audits for the other five so every dashboard row has a score.
insert into public.audits (id, business_id, raw_snapshot, competitor_ids, created_at) values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   $snap$
   {
     "source": "fixtures/BasicAudit.md + ReviewAudit.md + WebsiteAudit.md (GMB Everywhere, 11 Jul 2026)",
     "full_name": "मनोवेध हिप्नोक्लिनिक (संमोहन उपचार, NLP, EFT, प्राणीक हीलींग, ई.उपचार)",
     "address": "Panchavati krIshnabai ghat, krishnabai ghat, Near palkar highschool, 438, Somwar Peth, Karad, Maharashtra 415110",
     "phone": null,
     "claimed": true,
     "rating": 4.9,
     "reviews_total": 30,
     "profile_id": "6592322801685579138",
     "kg_id": "/g/11cmqfhs_0",
     "categories": {"primary": "Hospital", "secondary": [], "primary_flag": "generic/wrong vs Mental health clinic / Hypnotherapy service"},
     "services": [],
     "attributes": {"amenities": ["Gender-neutral toilets"], "payments": ["Cash only"], "parking": ["Free street parking", "On-site parking"]},
     "hours": {
       "monday": "12–9 am; 10 am–12 am", "tuesday": "12–9 am; 10 am–12 am",
       "wednesday": "12–9 am; 10:30 am–12 am", "thursday": "12–9 am; 10:30 am–12 am",
       "friday": "12–9 am; 10:30 am–12 am", "saturday": "12–9 am; 10 am–12 am",
       "sunday": "12–9 am; 10:30 am–12 am"
     },
     "hours_anomalies": ["Overnight block 12:00–9:00 AM on all 7 days — likely a data-entry error; confirm with owner"],
     "review_stats": {
       "avg_actual": 4.93, "with_photos": 0, "textless": 0, "local_guides": 1,
       "avg_reviews_per_reviewer": 9.87, "replied": 2, "reply_rate_pct": 6.67,
       "last_30d": 1, "last_6m": 7, "last_1y": 15,
       "velocity_per_month_6m": 1.2, "velocity_per_month_1y": 1.3
     },
     "post_stats": {"total": 7, "days_per_post": 293, "avg_chars": 171, "avg_words": 26.4, "with_image": 4, "with_link": 1, "with_video": 0},
     "website": {
       "url": "https://nlp-eft.grexa.site/", "rented_subdomain": true, "provider": "grexa.site",
       "nap_phone_mismatch": true, "title_ok": true,
       "meta_missing": ["Hospital", "krishnabai ghat"], "category_page": false,
       "word_count": 633, "spelling_issues": [{"found": "Minde", "suggested": "Mind"}],
       "heading_skips": ["H2→H5", "H2→H4", "H3→H6"],
       "click_to_call": "n/a — no phone on GBP or website"
     },
     "rank_note": {"keyword": "hypno clinic", "rank_near_pin": 1, "note": "rank ≠ demand — hypno clinic ≈ 20/mo vs mental health clinic karad ≈ 320/mo"}
   }
   $snap$::jsonb,
   '{}', '2026-07-08T09:12:00+05:30'),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '{"demo": true}'::jsonb, '{}', '2026-07-10T10:00:00+05:30'),
  ('a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', '{"demo": true}'::jsonb, '{}', '2026-07-06T11:30:00+05:30'),
  ('a4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', '{"demo": true}'::jsonb, '{}', '2026-07-02T09:45:00+05:30'),
  ('a5555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', '{"demo": true}'::jsonb, '{}', '2026-06-28T16:20:00+05:30'),
  ('a6666666-6666-4666-8666-666666666666', '66666666-6666-4666-8666-666666666666', '{"demo": true}'::jsonb, '{}', '2026-06-20T12:10:00+05:30')
on conflict (id) do nothing;

-- ---------- TB-003 audit_scores ----------
-- मनोवेध row matches the design-handoff P3 rubric card exactly (total 41).
insert into public.audit_scores
  (audit_id, total, claimed, category, completeness, photos, reviews_count, reviews_velocity, reply_rate, posts, website, nap)
values
  ('a1111111-1111-4111-8111-111111111111', 41, 10,  0,  7, 4, 5, 3, 1, 2, 6, 3),
  ('a2222222-2222-4222-8222-222222222222', 74, 10, 15, 12, 6, 6, 5, 4, 6, 7, 3),
  ('a3333333-3333-4333-8333-333333333333', 58, 10, 15,  8, 5, 4, 3, 2, 4, 5, 2),
  ('a4444444-4444-4444-8444-444444444444', 66, 10, 15, 10, 6, 5, 4, 3, 5, 6, 2),
  ('a5555555-5555-4555-8555-555555555555', 34, 10,  0,  5, 3, 4, 3, 1, 2, 4, 2),
  ('a6666666-6666-4666-8666-666666666666', 49, 10, 10,  7, 4, 5, 3, 2, 3, 3, 2)
on conflict (audit_id) do nothing;

-- ---------- TB-006 reviews_cache — all 30 fixture reviews ----------
-- Dates reconstructed from the fixture's relative dates (report date 11 Jul 2026).
-- Dates older than 1 year are approximated — the UI must label this.
insert into public.reviews_cache (business_id, review_id, rating, text, author, review_ts, replied) values
  ('11111111-1111-4111-8111-111111111111', 'fixture-r01', 5, 'Khupach Chan Anubhav Ala.kityek varshapasun asanarya samasya Sahaj nighun gelya. Ani imp mhanje adhi result bhetnar ki nahi yachi Khatri karun magch treatment Dili jate hi gosh Khup aavdali.bindhast visit karayala harakat nahi.fakt adhi appointment ghyavi lagate. Thank you doctor saheb.', 'Sandip Jadhav', '2026-07-04', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r02', 5, 'Khup chan anubhav ala.did varshapasun problem hota. Ata ekdam ok ahe. Kontyahi golya aoushadha shivay en no result bhetele.dhanyawad.', 'Amol Katwate', '2026-06-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r03', 5, 'Best ever experience...must visit for mental health. I m very satisfied by taking treatment course. Thank you .', 'Dipali Rajguru', '2026-05-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r04', 5, 'Best place for peace of mind.', 'Pawar Punam', '2026-03-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r05', 5, 'Khup chan anubhav... 100% khatrishir upchar bhetale..ekda Nikki bhet dyayla havi.', 'Ibrahim Bagwan', '2026-03-05', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r06', 5, 'Khup chan anubhav hota. Kahi samasya aso athava naso self development sathi tari khupach best place ahe. Ani kahi mansik samasya astil tari tya suddha sahaj nighun jatat. Mala swatala khupach chan anubhav aala. Ekda nkki bhet dya. Thank you doctor...', 'Abhishek Patil', '2026-03-01', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r07', 5, 'I have very best experience.must visit for any kind of mental health', 'Sanjay Govindrao Bhosale', '2026-02-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r08', 5, 'I have best experience. Very good result. Very helpfull for study.', 'Disha Kadam', '2025-12-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r09', 5, 'Khup chan anubhav ahe..mansik samsyansathi khupach chan fayada zala.', 'Varsha Patil', '2025-12-05', true),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r10', 5, 'I have best experience.I m completely come out from paranoid psychzophrenia within 10 days. Best result. Thank you sir.', 'Janhavi Patil', '2025-12-01', true),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r11', 5, 'I have a best experience and my problem over 17 years is solved by treatment. Must visit clinic for psychological problems...thank you very much doctor', 'Prakash Varude', '2025-11-28', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r12', 5, 'Great experience.... best result thank you', 'Aniruddha Patil', '2025-09-11', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r13', 5, 'Nice experience...must visit for mental health...', 'snehal patil', '2025-09-08', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r14', 5, 'I will definitely suggest to visit....nice experience ....thanks', 'saga patil', '2025-09-05', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r15', 5, 'I have great experience, best results...must visit for any psychological problems..100% cure without medicine... Thank you..doctor 😊', 'Vishal Desai', '2025-09-01', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r16', 3, 'Hypnotism clinic, we tried once.', 'Anirudha Patil', '2025-07-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r17', 5, 'Best experience. Mala khup chan result bhetale. 4 varsh dr che aoushadhe suru hoti.tari farak vatat navhata.ithe Yeun khup fayada zala.', 'Vasant Patil', '2024-07-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r18', 5, 'One of the bestest place for your all psychological issues... I have best experience in my problems. I m started new journey of my life with course of manovedh hypnoclinic. Thank you mManovedh..... 🙏', 'Saraswati Pawar', '2024-06-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r19', 5, 'An extremely positive experience. Found a new, refreshed and happy life. Just wonderful experience and I would suggest this to everyone.', 'Shraddha Pore', '2024-05-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r20', 5, 'Great experience....', 'Creative_kiran', '2023-07-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r21', 5, 'Nice session I taken lot of benefits from this session I completely transform my personality', 'Akshay Patil', '2023-06-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r22', 5, 'I m a 12th student and i got osm results in my study.... Very great experience.', 'robin Hood', '2023-05-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r23', 5, 'Best experience... Thank you', 'Suraj Patil', '2023-04-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r24', 5, 'Very good results. Fakt appointment velet bhetat nahi ha ek mudda sodala tar khupach chan anubhav ahe....', 'Vivek Vaske', '2023-03-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r25', 5, 'Nice n superb experience...... Great improvment in my stdy....', 'Alankar Joshi', '2023-02-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r26', 5, 'I have great experience. I got lot of changes in my study, memory, concentration,will power, and in overall my all personalty. Thank you...', 'Jayashri Deshpande', '2023-01-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r27', 5, 'Nice experience, I have lot of benifits 😊..', 'Vijay Pawar', '2022-12-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r28', 5, 'Aajchya Kalachi garaj ahe. Khup chan fayada Zala. Dhanyawad', 'Sarjerao Mane', '2022-11-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r29', 5, 'Khup chan anubhav......', 'Nilam Jadhav', '2022-10-15', false),
  ('11111111-1111-4111-8111-111111111111', 'fixture-r30', 5, 'I have best experience at manovedh. Since last 3 to 4 years i m in big trouble negative thoughts,anxiety, depression, and suicidal thoughts. After completing 7 dyas of course, I m 100℅ come out from all these problems...best method without medicine..I m totally satisfyd.....I will definitely rafer my frends...thank you manovedh....thank you doctor....', 'Rahul Jadhav', '2022-09-15', false)
on conflict (business_id, review_id) do nothing;

-- ---------- TB-012 posts_cache — 7 fixture posts ----------
-- avg chars = 1197/7 = 171 exactly · 4 with images · 1 with link · 0 video
-- (one post per ~293 days across Q4'20 → Q3'25, matching the P7 timeline)
insert into public.posts_cache (business_id, post_ts, text, char_count, has_media, links) values
  ('11111111-1111-4111-8111-111111111111', '2020-11-15T10:00:00+05:30', 'मनोवेध हिप्नोक्लिनिक — संमोहन उपचाराने भीती, टेंशन आणि नैराश्यातून कायमची मुक्ती. आजच अपॉइंटमेंट घ्या.', 156, true,  0),
  ('11111111-1111-4111-8111-111111111111', '2021-06-10T10:00:00+05:30', 'झोप न लागणे, नकारात्मक विचार, आत्मविश्वासाची कमतरता? गोळ्या-औषधांशिवाय उपचार. NLP आणि EFT तंत्राने मानसिक आरोग्य सुधारा. संपर्कासाठी प्रोफाइल पहा.', 204, true,  0),
  ('11111111-1111-4111-8111-111111111111', '2022-01-20T10:00:00+05:30', 'नवीन वर्षात नवी सुरुवात — व्यसनमुक्तीसाठी संमोहन उपचार. मोफत सल्ला.', 98,  false, 0),
  ('11111111-1111-4111-8111-111111111111', '2022-09-05T10:00:00+05:30', 'विद्यार्थ्यांसाठी खास — एकाग्रता, स्मरणशक्ती आणि अभ्यासातील प्रगतीसाठी Student Development Program. मर्यादित जागा.', 187, true,  0),
  ('11111111-1111-4111-8111-111111111111', '2023-04-18T10:00:00+05:30', 'वैवाहिक आणि कौटुंबिक समस्यांवर समुपदेशन. १५+ वर्षांचा अनुभव. आमच्या वेबसाइटला भेट द्या: https://nlp-eft.grexa.site/', 240, false, 1),
  ('11111111-1111-4111-8111-111111111111', '2024-02-02T10:00:00+05:30', 'प्राणीक हीलींग सत्रे आता उपलब्ध. आजच बुक करा.', 120, false, 0),
  ('11111111-1111-4111-8111-111111111111', '2025-08-30T10:00:00+05:30', 'मानसिक आरोग्य हीच खरी संपत्ती. भीती, चिंता, नैराश्य — कोणत्याही समस्येसाठी मनोवेध हिप्नोक्लिनिक, कराड. अपॉइंटमेंटसाठी आजच संपर्क करा.', 192, true,  0);

-- ---------- TB-013 website_audits — fixture findings ----------
-- psi_score 52 is a demo value (fixture has no PSI number); all booleans from fixtures/WebsiteAudit.md.
insert into public.website_audits (business_id, psi_score, title_ok, meta_ok, h1_ok, schema_ok, nap_match, city_kw, checked_at) values
  ('11111111-1111-4111-8111-111111111111', 52, true, false, false, false, false, true, '2026-07-08T09:12:00+05:30');

-- ---------- TB-004/005 grid scans — 3 runs, avg 7.8 → 6.1 → 4.6 ----------
insert into public.grid_scans (id, business_id, keyword, grid_size, radius_m, status, avg_rank, cost_usd, created_at) values
  ('c1111111-1111-4111-8111-111111111101', '11111111-1111-4111-8111-111111111111', 'hypno clinic', 5, 1500, 'done', 7.8, 0.0150, '2026-05-02T09:00:00+05:30'),
  ('c1111111-1111-4111-8111-111111111102', '11111111-1111-4111-8111-111111111111', 'hypno clinic', 5, 1500, 'done', 6.1, 0.0150, '2026-06-04T09:00:00+05:30'),
  ('c1111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'hypno clinic', 5, 1500, 'done', 4.6, 0.0150, '2026-07-11T09:00:00+05:30')
on conflict (id) do nothing;

-- 25 points per scan on a 5×5 grid centred on the business
-- (row-major from NW; lat step 750 m ≈ 0.006738°, lng step 750 m ≈ 0.007056° at 17.29°N).
-- May 2026 — ranks sum 195, avg 7.8:
insert into public.grid_points (scan_id, lat, lng, rank)
select 'c1111111-1111-4111-8111-111111111101'::uuid,
       17.293499 + (2 - (i / 5)) * 0.0067380,
       74.17943009999999 + ((i % 5) - 2) * 0.0070560,
       (array[4,3,5,7,11, 3,3,4,8,13, 3,2,3,9,15, 4,5,7,12,18, 5,7,10,14,20])[i + 1]
from generate_series(0, 24) as i;

-- June 2026 — ranks sum 152, avg 6.1:
insert into public.grid_points (scan_id, lat, lng, rank)
select 'c1111111-1111-4111-8111-111111111102'::uuid,
       17.293499 + (2 - (i / 5)) * 0.0067380,
       74.17943009999999 + ((i % 5) - 2) * 0.0070560,
       (array[3,2,4,5,9, 2,2,3,6,11, 2,1,2,7,13, 3,3,5,10,15, 4,5,8,12,15])[i + 1]
from generate_series(0, 24) as i;

-- July 2026 — the design-handoff P5 grid exactly (sum 116, avg 4.6):
insert into public.grid_points (scan_id, lat, lng, rank)
select 'c1111111-1111-4111-8111-111111111103'::uuid,
       17.293499 + (2 - (i / 5)) * 0.0067380,
       74.17943009999999 + ((i % 5) - 2) * 0.0070560,
       (array[2,1,3,3,7, 1,1,2,4,9, 1,1,1,5,11, 2,2,3,8,14, 3,4,6,9,13])[i + 1]
from generate_series(0, 24) as i;

-- ---------- TB-017/018 optimization sprint — active, day 9 (started 3 Jul) ----------
-- On श्री डेंटल केअर (client ●, GMB Boost + WhatsApp), baselined on its audit.
insert into public.optimization_sprints
  (id, business_id, started_at, baseline_audit_id, baseline_grid_id, status)
values
  ('d1111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333',
   '2026-07-03T10:00:00+05:30', 'a3333333-3333-4333-8333-333333333333', null, 'active')
on conflict (id) do nothing;

-- 23 fix tasks per §2.7b P12 demo states.
-- Groups derive from rubric_key (see src/types/sprint.ts):
-- Profile 10 · Reviews 3 · Posts 1 · Website 5 (4 vendor-blocked) · Visibility 1 · Citations 3
insert into public.fix_tasks (sprint_id, rubric_key, title, status, source, done_at, note, change_before, change_after) values
  -- Profile (10)
  ('d1111111-1111-4111-8111-111111111111', 'primary_category',    'Fix primary category',                          'done',    'audit',  '2026-07-03T12:00:00+05:30', null, 'Dentist', 'Dental clinic'),
  ('d1111111-1111-4111-8111-111111111111', 'phone',               'Add business phone number',                     'done',    'audit',  '2026-07-03T12:20:00+05:30', null, '', '+91 90000 00033'),
  ('d1111111-1111-4111-8111-111111111111', 'hours',               'Correct opening hours',                         'done',    'audit',  '2026-07-04T10:00:00+05:30', null, 'Mon–Sun 24 hours', 'Mon–Sat 10:00–20:00, Sun closed'),
  ('d1111111-1111-4111-8111-111111111111', 'services',            'Add services list (12 dental services)',        'doing',   'audit',  null, 'AI-prefilled list approved for 8 of 12', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'description',         'Rewrite business description (Marathi)',        'done',    'audit',  '2026-07-05T11:00:00+05:30', null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'photos',              'Upload 10 fresh photos',                        'doing',   'audit',  null, '6 of 10 published from media inbox', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'logo_cover',          'Set logo and cover photo',                      'done',    'audit',  '2026-07-06T09:30:00+05:30', null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'opening_date',        'Add business opening date',                     'done',    'audit',  '2026-07-06T09:35:00+05:30', null, '', '2015-04-01'),
  ('d1111111-1111-4111-8111-111111111111', 'social_links',        'Add social profile links',                      'todo',    'audit',  null, null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'utm_website',         'Set UTM-tagged website link',                   'todo',    'audit',  null, null, null, null),
  -- Reviews (3)
  ('d1111111-1111-4111-8111-111111111111', 'reply_backlog',       'Reply to all unanswered reviews',               'done',    'audit',  '2026-07-07T15:00:00+05:30', 'All 14 pending replies published', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'review_machine',      'Launch review-request machine (QR + WhatsApp)', 'todo',    'audit',  null, null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'review_velocity',     'Ask 10 recent patients for reviews',            'todo',    'audit',  null, null, null, null),
  -- Posts (1)
  ('d1111111-1111-4111-8111-111111111111', 'posts_cadence',       'Publish first 4 GBP posts of the month',        'done',    'audit',  '2026-07-08T10:00:00+05:30', null, null, null),
  -- Website (5 — 4 blocked on the website vendor, with copy-brief)
  ('d1111111-1111-4111-8111-111111111111', 'website_title',       'Fix title tag (category + locality)',           'blocked', 'audit',  null, 'Waiting on website vendor — brief copied 05 Jul', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'website_meta',        'Rewrite meta description',                      'blocked', 'audit',  null, 'Waiting on website vendor — brief copied 05 Jul', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'website_category_page','Create category/service pages',                'blocked', 'audit',  null, 'Waiting on website vendor — brief copied 05 Jul', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'website_headings',    'Fix heading hierarchy (H1→H2→H3)',              'blocked', 'audit',  null, 'Waiting on website vendor — brief copied 05 Jul', null, null),
  ('d1111111-1111-4111-8111-111111111111', 'website_spelling',    'Fix spelling issues on site',                   'todo',    'audit',  null, null, null, null),
  -- Visibility (1)
  ('d1111111-1111-4111-8111-111111111111', 'weak_zone',           'Improve south-east weak zone (Malkapur side)',  'todo',    'audit',  null, 'Plan: citations + service-area keywords', null, null),
  -- Citations (3)
  ('d1111111-1111-4111-8111-111111111111', 'citation_justdial',   'Fix JustDial listing NAP',                      'done',    'audit',  '2026-07-09T12:00:00+05:30', null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'citation_indiamart',  'Fix IndiaMART listing NAP',                     'todo',    'audit',  null, null, null, null),
  ('d1111111-1111-4111-8111-111111111111', 'citation_sulekha',    'Create Sulekha listing',                        'todo',    'manual', null, null, null, null);

-- ---------- Demo extras beyond §2.9 (P1/P9 need them on Day 5) ----------
-- Current-month service cycles matching the design-handoff P9 quotas.
insert into public.service_cycles (business_id, month, posts_done, posts_target, photos_done, photos_target, replies_pct, report_sent, checklist) values
  ('22222222-2222-4222-8222-222222222222', '2026-07-01', 6, 8, 7, 10, 100.00, false, '{"content_articles_done": 2, "content_articles_target": 4}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', '2026-07-01', 4, 8, 6, 10, 100.00, false, '{}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', '2026-07-01', 3, 8, 4, 10,  92.00, false, '{"note": "Manager access — copy/paste mode"}'::jsonb)
on conflict (business_id, month) do nothing;

-- 4 demo public-checker leads (2 today) for the P1 KPI card.
insert into public.leads_public (phone, business_name, consent_ts, score_shown, report_sent, created_at) values
  ('+919000000101', 'Shivneri Misal', '2026-07-12T09:15:00+05:30', 38, true,  '2026-07-12T09:15:00+05:30'),
  ('+919000000102', 'Karad Auto Garage', '2026-07-12T11:40:00+05:30', 55, false, '2026-07-12T11:40:00+05:30'),
  ('+919000000103', 'Sneha Ladies Tailor', '2026-07-10T17:05:00+05:30', 47, true,  '2026-07-10T17:05:00+05:30'),
  ('+919000000104', 'Om Sai Electricals', '2026-07-09T13:25:00+05:30', 62, true,  '2026-07-09T13:25:00+05:30');
