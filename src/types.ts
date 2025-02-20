// Common types
export type MediaType = 'movie' | 'tv';
export type Gender = 1 | 2; // 1 for female, 2 for male

export interface ActorInfo {
  name: string;
  imageUrl: string;
  birthYear: number | null;
  movieYear: number | null;
  role: string;
  popularity: number;
  gender: Gender;
  known_for_department: string;
  profile_path: string | null;
}

export interface SearchResult {
  id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  vote_average: number;
  name?: string;
}

export interface SelectedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: MediaType;
}

// API Response types
export interface SearchResponse {
  results: SearchResult[];
  total_results: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
}

export interface MovieCastParams {
  id: number;
  mediaType: MediaType;
  year?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface MovieCreditsResponse {
  cast: CastMember[];
}

export interface PersonDetailsResponse {
  id: number;
  name: string;
  birthday: string | null;
  popularity: number;
  gender: Gender;
  known_for_department: string;
  profile_path: string | null;
}