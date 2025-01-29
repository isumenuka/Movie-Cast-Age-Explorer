import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const TMDB_API_KEY = 'd312796c78899e791b1fbd3bee90cdbb';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

// Check if dist directory exists
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('Error: dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(distPath));

// Cache for search results
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

    const cacheKey = `${query}-${page}`;
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      return res.json(cachedResult.data);
    }

    const data = await fetchFromTMDB('/search/multi', {
      query: query.trim(),
      page,
      include_adult: false,
      language: 'en-US'
    });

    // Filter and transform results
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

    const response = {
      results,
      total_results: data.total_results,
      total_pages: data.total_pages
    };

    searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    res.json(response);
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Failed to search. Please try again.' });
  }
});

async function getMovieCredits(movieId, mediaType) {
  // Fetch all cast members without limiting
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
    // Process all cast members instead of slicing
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

    // Sort by popularity
    validCastDetails.sort((a, b) => b.popularity - a.popularity);

    res.json(validCastDetails);
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch cast information. Please try again.' 
    });
  }
});

app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (!existsSync(indexPath)) {
    return res.status(500).send('Error: index.html not found. Please rebuild the application.');
  }
  res.sendFile(indexPath);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});