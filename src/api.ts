const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // In production, use relative path
  : 'http://localhost:3000/api'; // In development, use localhost

export async function searchMovies(query: string, page: number = 1) {
  try {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    const response = await fetch(
      `${API_BASE_URL}/search?query=${encodeURIComponent(query.trim())}&page=${page}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search movies');
    }

    return data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

interface MovieCastParams {
  title: string;
  year?: string;
  id: number;
  mediaType: 'movie' | 'tv';
}

export async function fetchMovieCast({ title, year, id, mediaType }: MovieCastParams) {
  try {
    const response = await fetch(`${API_BASE_URL}/movie-cast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        movieName: title,
        year,
        id,
        mediaType
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch cast information');
    }

    return data;
  } catch (error) {
    console.error('Cast fetch error:', error);
    throw error;
  }
}