export interface User {
  user_id: number;
  username: string;
  email: string;
  display_name: string;
  bio?: string;
  avatar_url: string;
  banner_url?: string;
  created_at: string;
}

export interface Genre {
  genre_id: number;
  name: string;
  slug: string;
  icon_name?: string;
}

export interface Movie {
  movie_id: number;
  tmdb_id?: number;
  title: string;
  tagline?: string;
  overview: string;
  release_date: string;
  runtime: number;
  poster_url: string;
  backdrop_url: string;
  trailer_url?: string;
  director?: string;
  avg_rating: number;
  review_count: number;
  genres?: Genre[];
  bayesian_score?: number;
}

export interface Person {
  person_id: number;
  name: string;
  profile_path?: string;
  known_for_department?: string;
  biography?: string;
}

export interface MovieCastMember {
  person_id: number;
  name: string;
  profile_path?: string;
  character_name: string;
  job_role: string;
  cast_order: number;
}

export interface Review {
  review_id: number;
  user_id: number;
  movie_id: number;
  rating: number;
  review_text: string;
  has_spoilers: boolean;
  likes_count: number;
  created_at: string;
  updated_at?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  movie_title?: string;
  poster_url?: string;
  has_liked?: boolean;
}

export interface Watchlist {
  watchlist_id: number;
  user_id: number;
  name: string;
  description?: string;
  is_public: boolean;
  likes_count: number;
  created_at: string;
  movie_count?: number;
  movies?: Movie[];
  owner_username?: string;
  owner_display_name?: string;
  owner_avatar_url?: string;
}

export interface ActivityLog {
  log_id: number;
  user_id: number;
  activity_type: 'NEW_REVIEW' | 'LIKE_REVIEW' | 'CREATE_LIST' | 'WATCHLIST_ADD' | 'FOLLOW';
  target_id: number;
  metadata: any;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  movie_title?: string;
  movie_poster?: string;
}

export interface UserAnalytics {
  total_reviews: number;
  avg_rating: number;
  total_runtime_hours: number;
  total_watchlists: number;
  followers_count: number;
  following_count: number;
  rating_distribution: Record<string, number>;
  top_genres: Array<{ name: string; count: number }>;
}

export interface DbmsQueryMeta {
  sql: string;
  params?: any[];
  durationMs: number;
  rowCount: number;
  timestamp?: string;
}

export interface MoodDefinition {
  id: string;
  label: string;
  emoji: string;
  description: string;
  primaryGenres: string[];
  minRating: number;
  maxRuntime?: number;
  minRuntime?: number;
  accentColor: string;
}

export interface CineMoodResult {
  moodId: string;
  moodLabel: string;
  emoji: string;
  reason: string;
  curatorNote: string;
  matchedGenres: string[];
  movies: Movie[];
  meta: DbmsQueryMeta;
}

export interface FilmDnaAxis {
  key: string;
  label: string;
  value: number; // 0 to 100
  rawValue: string;
  description: string;
}

export interface FilmDnaArchetype {
  title: string;
  motto: string;
  description: string;
  badgeColor: string;
}

export interface FilmDnaData {
  userId: number;
  username: string;
  displayName: string;
  archetype: FilmDnaArchetype;
  axes: FilmDnaAxis[];
  metrics: {
    genreDiversityScore: number;
    criticSeverityScore: number;
    watchVolumeScore: number;
    socialEngagementScore: number;
    epicPreferenceScore: number;
    decadeSpreadScore: number;
    distinctGenresCount: number;
    totalAvailableGenres: number;
    avgRating: number;
    totalReviews: number;
    epicFilmsCount: number;
    epicFilmsPct: number;
    avgRuntimeMinutes: number;
    decadeSpreadYears: number;
    minReleaseYear: number;
    maxReleaseYear: number;
    socialScore: number;
  };
  meta: DbmsQueryMeta;
}


