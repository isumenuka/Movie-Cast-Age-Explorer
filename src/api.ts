import { tmdbApi } from './services/tmdb';
import type { SearchResponse, MovieCastParams, ActorInfo } from './types';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, { data: SearchResponse; timestamp: number }>();

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
    const data = await tmdbApi.searchMulti(query.trim(), String(page));
    searchCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to search movies');
  }
}

export async function fetchMovieCast({ id, mediaType, year }: MovieCastParams): Promise<ActorInfo[]> {
  try {
    // Get credits based on media type
    const credits = mediaType === 'movie'
      ? await tmdbApi.getMovieCredits(id)
      : await tmdbApi.getTVCredits(id);

    // Get details for each cast member
    const castDetails = await Promise.all(
      credits.cast.map(async (actor) => {
        try {
          const personDetails = await tmdbApi.getPersonDetails(actor.id);
          return {
            name: actor.name,
            birthYear: personDetails?.birthday ? parseInt(personDetails.birthday.split('-')[0]) : null,
            movieYear: parseInt(year) || null,
            role: actor.character,
            imageUrl: tmdbApi.getImageUrl(actor.profile_path),
            popularity: personDetails.popularity,
            gender: personDetails.gender,
            known_for_department: personDetails.known_for_department,
            profile_path: actor.profile_path,
          };
        } catch (error) {
          console.error(`Error processing cast member ${actor.name}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by popularity
    const validCastDetails = castDetails.filter(Boolean) as ActorInfo[];
    return validCastDetails.sort((a, b) => b.popularity - a.popularity);
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to fetch cast information');
  }
}