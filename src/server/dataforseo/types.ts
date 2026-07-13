/**
 * DataForSEO raw response shapes — only the fields we read, all optional
 * (the vendor omits fields freely; the normalizer is defensive).
 */

export interface DfsTask<R = unknown> {
  id: string;
  status_code: number;
  status_message: string;
  cost: number | null;
  result: R[] | null;
}

export interface DfsEnvelope<R = unknown> {
  status_code: number;
  status_message: string;
  cost: number | null;
  tasks: Array<DfsTask<R>> | null;
}

/** business_data/google/my_business_info result item. */
export interface RawBusinessInfo {
  title?: string;
  description?: string;
  category?: string;
  additional_categories?: string[];
  cid?: string;
  place_id?: string;
  feature_id?: string;
  address?: string;
  snippet?: string;
  address_info?: {
    address?: string;
    city?: string;
    region?: string;
    zip?: string;
    country_code?: string;
  };
  phone?: string;
  url?: string;
  domain?: string;
  total_photos?: number;
  is_claimed?: boolean;
  latitude?: number;
  longitude?: number;
  rating?: { value?: number; votes_count?: number };
  attributes?: {
    available_attributes?: Record<string, string[]>;
    unavailable_attributes?: Record<string, string[]>;
  };
  work_time?: {
    work_hours?: {
      timetable?: Record<
        string,
        Array<{
          open?: { hour?: number; minute?: number };
          close?: { hour?: number; minute?: number };
        }> | null
      >;
      current_status?: string;
    };
  };
  people_also_search?: Array<{ title?: string; cid?: string; rating?: { value?: number } }>;
}

/** business_data/google/reviews result (task-level) + its items. */
export interface RawReviewsResult {
  keyword?: string;
  cid?: string;
  place_id?: string;
  reviews_count?: number;
  rating?: { value?: number; votes_count?: number };
  items?: RawReviewItem[];
}

export interface RawReviewItem {
  review_id?: string;
  rating?: { value?: number };
  timestamp?: string; // "2026-05-11 07:14:22 +00:00"
  time_ago?: string; // "2 months ago"
  review_text?: string | null;
  original_review_text?: string | null;
  profile_name?: string;
  reviews_count?: number;
  photos_count?: number;
  local_guide?: boolean;
  images?: Array<{ url?: string }> | null;
  owner_answer?: string | null;
  original_owner_answer?: string | null;
}

/** business_data/google/my_business_updates result + items. */
export interface RawUpdatesResult {
  items?: RawUpdateItem[];
}

export interface RawUpdateItem {
  post_id?: string;
  timestamp?: string;
  snippet?: string | null;
  post_text?: string | null;
  images_url?: string | null;
  post_image_url?: string | null;
  links?: Array<{ url?: string; title?: string }> | null;
}

/** serp/google/maps + serp/google/local_finder result items. */
export interface RawMapsResult {
  keyword?: string;
  items?: RawMapsItem[];
}

export interface RawMapsItem {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  title?: string;
  category?: string;
  address?: string;
  phone?: string;
  url?: string;
  domain?: string;
  cid?: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
  rating?: { value?: number; votes_count?: number };
  total_photos?: number;
}

/** keywords_data/google_ads/search_volume result item. */
export interface RawKeywordVolume {
  keyword?: string;
  search_volume?: number | null;
  competition?: string | null;
  monthly_searches?: Array<{ year: number; month: number; search_volume: number }>;
}
