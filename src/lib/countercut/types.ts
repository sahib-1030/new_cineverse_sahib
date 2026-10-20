export type Claim = {
  text: string;
  evidenceIds: string[]; // Must resolve to returned DB evidence records
  strength: 'supported' | 'tentative' | 'insufficient';
};

export type FactualMetric = {
  label: string;
  value: number | string;
  subtext?: string;
  sampleSize?: number;
};

export type ToolReceipt = {
  toolName: string;
  resultCount: number;
  durationMs: number;
  description: string;
  recordsReturned?: number;
  latencyMs?: number;
  args?: Record<string, any>;
};

export type AgentToolReceipt = ToolReceipt;

export type EvidenceRecord = {
  id: string; // e.g. 'R-1042'
  sourceType: 'review' | 'movie' | 'metric';
  targetId: number;
  title: string;
  author?: string;
  rating?: number;
  snippet: string;
  isSpoiler?: boolean;
  metadata?: Record<string, any>;
};

export type CountercutEvidence = EvidenceRecord;

export type ProposedChallenge = {
  name: string;
  reason: string;
  movieIds: number[];
  movies?: {
    movie_id: number;
    title: string;
    poster_url?: string;
    backdrop_url?: string;
    avg_rating?: number;
    release_date?: string;
  }[];
};

export type CountercutCase = {
  id: string;
  mode: 'taste_contradiction' | 'opposite_critic';
  subjectMovieIds: number[];
  headline: string;
  hypothesis: string;
  factualMetrics: FactualMetric[];
  claims: Claim[];
  alternativeExplanations: string[];
  limitations: string[];
  evidence: EvidenceRecord[];
  toolReceipts: ToolReceipt[];
  proposedChallenge?: ProposedChallenge;
  isDeterministicFallback?: boolean;
  fallbackReason?: string;
  modelName?: string;
  createdAt?: string;

  // Rich rendering metadata
  primaryMovie?: {
    movie_id: number;
    title: string;
    poster_url?: string;
    backdrop_url?: string;
    release_date?: string;
    director?: string;
    runtime?: number;
    genres?: string[];
    synopsis?: string;
    userRating?: number;
    criticRating?: number;
  };
  secondaryMovie?: {
    movie_id: number;
    title: string;
    poster_url?: string;
    backdrop_url?: string;
    release_date?: string;
    director?: string;
    runtime?: number;
    genres?: string[];
    synopsis?: string;
    userRating?: number;
    criticRating?: number;
  };
  oppositeCritic?: {
    userId: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  connectorLabel?: string;
};

export type UserReviewRecord = {
  review_id: number;
  movie_id: number;
  title: string;
  poster_url: string;
  backdrop_url: string;
  director: string;
  release_date: string;
  runtime: number;
  synopsis: string;
  rating: number;
  review_text: string;
  has_spoilers: boolean;
  created_at: string;
  genres: string[];
};

export type ContrastPair = {
  highMovie: UserReviewRecord;
  lowMovie: UserReviewRecord;
  sharedGenres: string[];
  ratingDifference: number;
};

export type OpposingCriticCandidate = {
  critic: {
    userId: number;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  sharedFilmCount: number;
  agreementPercentage: number;
  targetMovieId: number;
  targetMovieTitle: string;
  userRating: number;
  criticRating: number;
  ratingDifference: number;
  userReview: {
    reviewId: number;
    text: string;
    hasSpoilers: boolean;
  };
  criticReview: {
    reviewId: number;
    text: string;
    hasSpoilers: boolean;
  };
  sharedReviews: {
    movieId: number;
    title: string;
    userRating: number;
    criticRating: number;
  }[];
};
