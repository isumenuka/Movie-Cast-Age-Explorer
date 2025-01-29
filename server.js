import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();

// Validate required environment variables
const requiredEnvVars = [
  'VITE_TMDB_API_KEY',
  'VITE_TMDB_API_BASE_URL',
  'VITE_TMDB_IMAGE_BASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Missing required environment variables:');
  console.error('\x1b[33m%s\x1b[0m', missingEnvVars.join(', '));
  console.error('\x1b[36m%s\x1b[0m', '\nPlease create a .env file in the project root with the following content:');
  console.error('\x1b[37m%s\x1b[0m', `
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_TMDB_API_BASE_URL=https://api.themoviedb.org/3
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500

You can get a TMDB API key by:
1. Creating an account at https://www.themoviedb.org/
2. Going to Settings > API > Create new API key
`);
  process.exit(1);
}

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;
const TMDB_IMAGE_BASE_URL = process.env.VITE_TMDB_IMAGE_BASE_URL;
const TMDB_API_BASE_URL = process.env.VITE_TMDB_API_BASE_URL;

// Check if dist directory exists
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: dist directory not found.');
  console.error('\x1b[36m%s\x1b[0m', 'Please run "npm run build" first.');
  process.exit(1);
}

// Configure CORS with specific options
app.use(cors({
  origin: [process.env.NETLIFY_URL].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(distPath));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
    res.status(500).set('Content-Type', 'application/json').json({
      error: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    });
});

// Cache for search results with rate limiting
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 30;
const requestCounts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const requestHistory = requestCounts.get(ip) || [];
  const recentRequests = requestHistory.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  requestCounts.set(ip, [...recentRequests, now]);
  return false;
}

async function fetchFromTMDB(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams({
      api_key: TMDB_API_KEY,
      ...params
    }).toString();
    
    const response = await fetch(`${TMDB_API_BASE_URL}${endpoint}?${queryString}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ status_message: 'Unknown error' }));
      throw new Error(`TMDB API error: ${error.status_message || response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error('TMDB API Error:', error);
    throw error;
  }
}

app.get('/api/search', async (req, res, next) => {
  try {
    const clientIP = req.ip;
    if (isRateLimited(clientIP)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

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
        title: item.title || item.name || '',
        media_type: item.media_type,
        poster_path: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
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
    next(error);
  }
});

async function getAllSeasonCredits(tvId) {
  try {
    // First, get the TV show details to know how many seasons there are
    const tvDetails = await fetchFromTMDB(`/tv/${tvId}`);
    const seasonNumbers = Array.from({ length: tvDetails.number_of_seasons }, (_, i) => i + 1);
    
    // Get credits for each season
    const seasonCreditsPromises = seasonNumbers.map(seasonNumber =>
      fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}/credits`)
        .catch(error => {
          console.error(`Error fetching season ${seasonNumber} credits:`, error);
          return { cast: [] };
        })
    );
    
    const seasonCredits = await Promise.all(seasonCreditsPromises);
    
    // Combine all cast members and remove duplicates
    const castMap = new Map();
    seasonCredits.forEach(credits => {
      credits.cast?.forEach(castMember => {
        // Only update if the new role is more substantial (appears earlier in the cast list)
        if (!castMap.has(castMember.id) || 
            castMap.get(castMember.id).order > castMember.order) {
          castMap.set(castMember.id, castMember);
        }
      });
    });
    
    return Array.from(castMap.values());
  } catch (error) {
    console.error('Error fetching season credits:', error);
    return [];
  }
}

async function getMovieCredits(movieId, mediaType) {
  try {
    let castMembers = [];
    
    if (mediaType === 'movie') {
      // For movies, get the regular credits and aggregate credits
      const [creditsData, aggregateCredits] = await Promise.all([
        fetchFromTMDB(`/movie/${movieId}/credits`),
        fetchFromTMDB(`/movie/${movieId}/credits`, { language: 'en-US' })
      ]);
      
      // Combine and deduplicate cast members
      const castMap = new Map();
      [...(creditsData.cast || []), ...(aggregateCredits.cast || [])].forEach(member => {
        if (!castMap.has(member.id) || castMap.get(member.id).order > member.order) {
          castMap.set(member.id, member);
        }
      });
      castMembers = Array.from(castMap.values());
    } else if (mediaType === 'tv') {
      // For TV shows, get both the main credits, aggregate credits, and all season credits
      const [mainCredits, aggregateCredits, seasonCastMembers] = await Promise.all([
        fetchFromTMDB(`/tv/${movieId}/credits`),
        fetchFromTMDB(`/tv/${movieId}/aggregate_credits`).catch(() => ({ cast: [] })),
        getAllSeasonCredits(movieId)
      ]);
      
      // Combine all credits and remove duplicates
      const castMap = new Map();
      [...(mainCredits.cast || []), 
       ...(aggregateCredits.cast || []), 
       ...seasonCastMembers].forEach(member => {
        if (!castMap.has(member.id) || castMap.get(member.id).order > member.order) {
          castMap.set(member.id, member);
        }
      });
      
      castMembers = Array.from(castMap.values());
    }

    // Sort by order to prioritize main cast members
    return castMembers.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error fetching credits:', error);
    throw error;
  }
}

async function getPersonDetails(personId) {
  try {
    const [detailsResponse, combinedCreditsResponse] = await Promise.all([
      fetch(`${TMDB_API_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}&language=en-US`),
      fetch(`${TMDB_API_BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}&language=en-US`)
    ]);

    if (!detailsResponse.ok || !combinedCreditsResponse.ok) {
      throw new Error('Failed to fetch person details');
    }

    const [details, combinedCredits] = await Promise.all([
      detailsResponse.json(),
      combinedCreditsResponse.json()
    ]);

    return {
      ...details,
      popularity: details.popularity || 0,
      gender: details.gender || 0,
      known_for_department: details.known_for_department || 'Acting',
      combined_credits: combinedCredits
    };
  } catch (error) {
    console.error('Error fetching person details:', error);
    throw error;
  }
}

app.post('/api/movie-cast', async (req, res) => {
  try {
    const { id, mediaType } = req.body;
    if (!id || !mediaType) {
      return res.status(400).json({ error: 'Movie ID and media type are required' });
    }

    const cast = await getMovieCredits(id, mediaType);
    
    // Process all cast members in parallel
    const castDetailsPromises = cast.map(async (actor) => {
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
          known_for_department: personDetails.known_for_department || 'Acting',
          profile_path: actor.profile_path,
          order: actor.order || 999
        };
      } catch (error) {
        console.error(`Error processing cast member ${actor.name}:`, error);
        return null;
      }
    });

    const castDetails = await Promise.all(castDetailsPromises);
    const validCastDetails = castDetails.filter(Boolean);

    // Sort cast members by popularity and order
    const sortedCast = validCastDetails.sort((a, b) => {
      // First sort by cast order
      const orderDiff = (a.order || 999) - (b.order || 999);
      if (orderDiff !== 0) return orderDiff;
      // Then by popularity
      return (b.popularity || 0) - (a.popularity || 0);
    });

    // Ensure we have enough actors and actresses
    const actresses = sortedCast.filter(actor => 
      actor.gender === 1 && actor.known_for_department === 'Acting'
    );
    const actors = sortedCast.filter(actor => 
      actor.gender === 2 && actor.known_for_department === 'Acting'
    );

    if (actresses.length < 10 || actors.length < 10) {
      // If we don't have enough cast members, try to fetch more from other seasons or related content
      console.log(`Warning: Not enough cast members. Actresses: ${actresses.length}, Actors: ${actors.length}`);
    }

    res.json(sortedCast);
  } catch (error) {
    console.error('Server Error:', error);
     res.status(500).set('Content-Type', 'application/json').json({
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
