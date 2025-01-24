import React, { useState, useEffect } from 'react';
import { Loader2, Search, Star, Calendar, Filter } from 'lucide-react';
import { searchMovies } from '../api';
import type { SearchResult, SelectedMovie } from '../types';

interface SearchFormProps {
  movieName: string;
  setMovieName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  onMovieSelect: (movie: SelectedMovie | null) => void;
  selectedMovie: SelectedMovie | null;
}

export function SearchForm({ 
  movieName, 
  setMovieName, 
  onSubmit, 
  isLoading, 
  onMovieSelect,
  selectedMovie 
}: SearchFormProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleSearch = async () => {
      if (movieName.trim().length >= 2) {
        setSearchLoading(true);
        setSearchError('');
        try {
          const data = await searchMovies(movieName);
          setSearchResults(data.results);
          setShowResults(true);
        } catch (error) {
          setSearchError(error instanceof Error ? error.message : 'Failed to search movies. Please try again.');
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
        setSearchError('');
      }
    };

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(handleSearch, 300);
    setSearchTimeout(timeout);

    // Cleanup
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [movieName]);

  useEffect(() => {
    if (yearFilter) {
      const filtered = searchResults.filter(result => {
        const year = (result.release_date || result.first_air_date || '').split('-')[0];
        return year === yearFilter;
      });
      setFilteredResults(filtered);
    } else {
      setFilteredResults(searchResults);
    }
  }, [searchResults, yearFilter]);

  const handleResultClick = (result: SearchResult) => {
    const selectedMovie: SelectedMovie = {
      id: result.id,
      title: result.title || result.name || '',
      poster_path: result.poster_path,
      overview: result.overview,
      release_date: result.release_date,
      first_air_date: result.first_air_date,
      vote_average: result.vote_average,
      media_type: result.media_type
    };
    
    setMovieName(selectedMovie.title);
    onMovieSelect(selectedMovie);
    setShowResults(false);
    setYearFilter('');
    setSearchError('');
  };

  const getYear = (movie: SelectedMovie) => {
    return movie.release_date?.split('-')[0] || 
           movie.first_air_date?.split('-')[0] || 
           'N/A';
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl mx-auto relative">
      <div className="mb-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Movie/TV Show Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={movieName}
              onChange={(e) => {
                setMovieName(e.target.value);
                if (selectedMovie) {
                  onMovieSelect(null);
                }
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border pl-10"
              placeholder="Search movies or TV shows..."
              minLength={2}
            />
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 animate-spin" />
            )}
          </div>
          {searchError && (
            <p className="mt-2 text-sm text-red-600">{searchError}</p>
          )}
          {movieName.trim().length === 1 && (
            <p className="mt-2 text-sm text-gray-500">Please enter at least 2 characters</p>
          )}
        </div>

        {showResults && searchResults.length > 0 && !selectedMovie && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Year
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  placeholder="Enter year (e.g., 1990)"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 border pl-10"
                  min="1900"
                  max={new Date().getFullYear()}
                />
                <Filter className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setYearFilter('')}
                className="px-4 py-3 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedMovie && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{selectedMovie.title}</h2>
                <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span className="font-medium">{getYear(selectedMovie)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onMovieSelect(null)}
                className="text-white/80 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-b-lg p-4 flex gap-4">
            {selectedMovie.poster_path ? (
              <img
                src={selectedMovie.poster_path}
                alt={selectedMovie.title}
                className="w-24 h-36 object-cover rounded-md shadow-md"
              />
            ) : (
              <div className="w-24 h-36 bg-gray-200 rounded-md flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image</span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                  {selectedMovie.media_type.toUpperCase()}
                </span>
                <div className="flex items-center text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm ml-1">{selectedMovie.vote_average.toFixed(1)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">{selectedMovie.overview}</p>
            </div>
          </div>
        </div>
      )}

      {showResults && !selectedMovie && (
        <div className="absolute z-10 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {filteredResults.length > 0 ? (
            filteredResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-start space-x-3"
              >
                {result.poster_path ? (
                  <img
                    src={result.poster_path}
                    alt={result.title}
                    className="w-12 h-18 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{result.title || result.name}</h4>
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs ml-1">{result.vote_average.toFixed(1)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {result.media_type.toUpperCase()} • {result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0] || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">{result.overview}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              {yearFilter ? `No results found for year ${yearFilter}` : 'No results found'}
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !selectedMovie}
        className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Fetching cast information...
          </>
        ) : (
          'Find Cast Information'
        )}
      </button>
    </form>
  );
}