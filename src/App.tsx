import React, { useState } from 'react';
import { Film, SortAsc } from 'lucide-react';
import { ActorInfo, SelectedMovie } from './types';
import { fetchMovieCast } from './api';
import { SearchForm } from './components/SearchForm';
import { ActorCard } from './components/ActorCard';

function App() {
  const [movieName, setMovieName] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actors, setActors] = useState<ActorInfo[]>([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'age'>('popularity');
  const currentYear = new Date().getFullYear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovie) {
      setError('Please select a movie from the search results');
      return;
    }

    setIsLoading(true);
    setError('');
    setActors([]);

    try {
      const movieYear = selectedMovie.release_date?.split('-')[0] || 
                       selectedMovie.first_air_date?.split('-')[0];
      const data = await fetchMovieCast({
        title: selectedMovie.title,
        year: movieYear,
        id: selectedMovie.id,
        mediaType: selectedMovie.media_type
      });
      setActors(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch actor information. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedActors = [...actors].sort((a, b) => {
    if (sortBy === 'popularity') {
      return b.popularity - a.popularity;
    }
    return (b.birthYear || 0) - (a.birthYear || 0);
  });

  const femaleActors = sortedActors.filter(actor => actor.gender === 1 && actor.known_for_department === 'Acting');
  const otherActors = sortedActors.filter(actor => actor.gender !== 1 || actor.known_for_department !== 'Acting');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <Film className="w-10 h-10 text-indigo-600" />
            Movie Cast Age Explorer
          </h1>
          <p className="text-gray-600 mt-2">
            Enter a movie or TV show name to discover the cast's ages
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
          <SearchForm
            movieName={movieName}
            setMovieName={setMovieName}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onMovieSelect={setSelectedMovie}
            selectedMovie={selectedMovie}
          />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {actors.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Cast Information</h2>
              <button
                onClick={() => setSortBy(sortBy === 'popularity' ? 'age' : 'popularity')}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 transition-colors"
              >
                <SortAsc className="w-4 h-4" />
                Sort by {sortBy === 'popularity' ? 'Age' : 'Popularity'}
              </button>
            </div>

            {femaleActors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Featured Actresses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {femaleActors.map((actor, index) => (
                    <ActorCard
                      key={`${actor.name}-${index}`}
                      actor={actor}
                      currentYear={currentYear}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherActors.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Other Cast Members</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherActors.map((actor, index) => (
                    <ActorCard
                      key={`${actor.name}-${index}`}
                      actor={actor}
                      currentYear={currentYear}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;