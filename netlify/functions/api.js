import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'd312796c78899e791b1fbd3bee90cdbb';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

app.use(cors());
app.use(express.json());

async function fetchFromTMDB(endpoint, params = {}) {
  const queryString = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...params
  }).toString();
  
  const response = await fetch(`${TMDB_API_BASE_URL}${endpoint}?${queryString}`);
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
}

app.get('/api/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const data = await fetchFromTMDB('/search/multi', {
      query: query.trim(),
      page,
      include_adult: false,
      language: 'en-US'
    });

    const results = data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => ({
        id: item.id,
        title: item.title || item.name,
        media_type: item.media_type,
        poster_path: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
        release_date: item.release_date || item.first_air_date,
        overview: item.overview,
        vote_average: item.vote_average
      }));

    res.json({
      results,
      total_results: data.total_results,
      total_pages: data.total_pages
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Failed to search. Please try again.' });
  }
});

async function getMovieCredits(movieId, mediaType) {
  const response = await fetch(
    `${TMDB_API_BASE_URL}/${mediaType}/${movieId}/credits?api_key=${TMDB_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.cast || [];
}

async function getPersonDetails(personId) {
  const response = await fetch(
    `${TMDB_API_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    ...data,
    popularity: data.popularity || 0,
    gender: data.gender || 0,
    known_for_department: data.known_for_department || 'Unknown'
  };
}

app.post('/api/movie-cast', async (req, res) => {
  try {
    const { id, mediaType } = req.body;
    if (!id || !mediaType) {
      return res.status(400).json({ error: 'Movie ID and media type are required' });
    }

    const credits = await getMovieCredits(id, mediaType);
    const castDetails = await Promise.all(
      credits.map(async (actor) => {
        try {
          const personDetails = await getPersonDetails(actor.id);
          return {
            name: actor.name,
            birthYear: personDetails?.birthday ? parseInt(personDetails.birthday.split('-')[0]) : null,
            movieYear: parseInt(req.body.year) || null,
            role: actor.character,
            imageUrl: actor.profile_path 
              ? `${TMDB_IMAGE_BASE_URL}${actor.profile_path}`
              : 'https://via.placeholder.com/500x750?text=No+Image+Available',
            popularity: personDetails.popularity,
            gender: personDetails.gender,
            known_for_department: personDetails.known_for_department
          };
        } catch (error) {
          console.error(`Error processing cast member ${actor.name}:`, error);
          return null;
        }
      })
    );

    const validCastDetails = castDetails.filter(Boolean);
    validCastDetails.sort((a, b) => b.popularity - a.popularity);

    res.json(validCastDetails);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch cast information. Please try again.' 
    });
  }
});

export const handler = serverless(app);