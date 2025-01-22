export interface ActorInfo {
  name: string;
  imageUrl: string;
  birthYear: number;
  movieYear: number;
  role: string;
  popularity: number;
  gender: number;
  known_for_department: string;
  profile_path: string | null;
}

export interface SearchResult {
  id: number;
  title: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  vote_average: number;
}

export interface SelectedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
}