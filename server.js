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

// Default values for environment variables
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || 'd312796c78899e791b1fbd3bee90cdbb';
const TMDB_IMAGE_BASE_URL = process.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500';
const TMDB_API_BASE_URL = process.env.VITE_TMDB_API_BASE_URL || 'https://api.themoviedb.org/3';

// Check if dist directory exists
const distPath = join(__dirname, 'dist');
if (!existsSync(distPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: dist directory not found.');
  console.error('\x1b[36m%s\x1b[0m', 'Please run "npm run build" first.');
  process.exit(1);
}

// Configure CORS with specific options
app.use(cors({
  origin: [process.env.NETLIFY_URL, 'http://localhost:5173'].filter(Boolean),
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(distPath));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
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

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});