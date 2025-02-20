import type { SearchResponse, MovieCreditsResponse, PersonDetailsResponse } from '../types';

// Fallback values in case environment variables are not set
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'd312796c78899e791b1fbd3bee90cdbb';
const TMDB_API_BASE_URL = import.meta.env.VITE_TMDB_API_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500';

interface ApiOptions {
  method?: string;
  params?: Record<string, string>;
  body?: unknown;
}

async function tmdbFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', params = {}, body } = options;

  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  try {
    const response = await fetch(
      `${TMDB_API_BASE_URL}${endpoint}?${queryParams}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ status_message: 'Unknown error' }));
      throw new Error(`TMDB API error: ${error.status_message || response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch data from TMDB API');
  }
}

export const tmdbApi = {
  async searchMulti(query: string, page = '1'): Promise<SearchResponse> {
    const response = await tmdbFetch('/search/multi', {
      params: {
        query,
        page,
        include_adult: 'false',
      },
    });

    return {
      results: response.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => ({
          id: item.id,
          title: item.title || item.name,
          media_type: item.media_type,
          poster_path: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          overview: item.overview,
          vote_average: item.vote_average,
        })),
      total_results: response.total_results,
      total_pages: response.total_pages,
    };
  },

  async getMovieCredits(movieId: number): Promise<MovieCreditsResponse> {
    const response = await tmdbFetch(`/movie/${movieId}/credits`);
    return {
      cast: response.cast || [],
    };
  },

  async getTVCredits(tvId: number): Promise<MovieCreditsResponse> {
    const response = await tmdbFetch(`/tv/${tvId}/credits`);
    return {
      cast: response.cast || [],
    };
  },

  async getPersonDetails(personId: number): Promise<PersonDetailsResponse> {
    const response = await tmdbFetch(`/person/${personId}`);
    return {
      ...response,
      popularity: response.popularity || 0,
      gender: response.gender || 0,
      known_for_department: response.known_for_department || 'Acting',
    };
  },

  getImageUrl(path: string | null): string {
    return path ? `${TMDB_IMAGE_BASE_URL}${path}` : 'https://via.placeholder.com/500x750?text=No+Image+Available';
  },
};