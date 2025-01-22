const API_BASE_URL = 'http://localhost:3000/api';

export async function searchMovies(query: string, page: number = 1) {
  const response = await fetch(
    `${API_BASE_URL}/search?query=${encodeURIComponent(query)}&page=${page}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search');
  }

  return response.json();
}

interface MovieCastParams {
  title: string;
  year?: string;
  id: number;
  mediaType: 'movie' | 'tv';
}

export async function fetchMovieCast({ title, year, id, mediaType }: MovieCastParams) {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch cast information');
  }

  return response.json();
}