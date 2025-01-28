import { SearchResponse, MovieCastParams, ActorInfo, ApiError } from '../types';

const API_BASE_URL = import.meta.env.PROD 
  ? '/api'
  : 'http://localhost:3000/api';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid response from server');
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as ApiError).error || 'An error occurred');
  }
  
  return data as T;
}

export async function searchMovies(query: string, page: number = 1): Promise<SearchResponse> {
  if (!query?.trim()) {
    throw new Error('Search query is required');
  }

  const cacheKey = `${query}-${page}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/search?${new URLSearchParams({
        query: query.trim(),
        page: String(page)
      })}`
    );

    const data = await handleResponse<SearchResponse>(response);
    searchCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to search movies');
  }
}

export async function fetchMovieCast(params: MovieCastParams): Promise<ActorInfo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/movie-cast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    return handleResponse<ActorInfo[]>(response);
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch cast information');
  }
}