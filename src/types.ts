// Common types
export type MediaType = 'movie' | 'tv';
export type Gender = 1 | 2; // 1 for female, 2 for male

export interface ActorInfo {
  name: string;
  imageUrl: string;
  birthYear: number;
  movieYear: number;
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