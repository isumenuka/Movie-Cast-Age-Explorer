import React, { useState } from 'react';
import { ActorCard } from './ActorCard';
import { ActorInfo } from '../types';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface AllCastMembersProps {
  actors: ActorInfo[];
  currentYear: number;
}

export function AllCastMembers({ actors, currentYear }: AllCastMembersProps) {
  const [showOnlyPopular, setShowOnlyPopular] = useState(true); // Default to showing popular only
  const popularityThreshold = 20; // Threshold for popular cast members
  const maxActors = 10; // Maximum number of actors to display per gender

  const filterActors = (castMembers: ActorInfo[]) => {
    // Sort by popularity first
    const sortedMembers = [...castMembers].sort((a, b) => b.popularity - a.popularity);
    
    if (showOnlyPopular) {
      // Filter by popularity threshold and take top 10
      return sortedMembers
        .filter(actor => actor.popularity >= popularityThreshold)
        .slice(0, maxActors);
    }
    // If showing all, still limit to top 10 most popular
    return sortedMembers.slice(0, maxActors);
  };

  const femaleActors = filterActors(actors.filter(actor => 
    actor.gender === 1 && actor.known_for_department === 'Acting'
  ));

  const maleActors = filterActors(actors.filter(actor => 
    actor.gender === 2 && actor.known_for_department === 'Acting'
  ));

  const renderCastSection = (title: string, castMembers: ActorInfo[]) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
          {title} ({castMembers.length})
        </h3>
      </div>
      {castMembers.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700">
              No {title.toLowerCase()} found {showOnlyPopular ? 'with high popularity' : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {castMembers.map((actor, index) => (
            <ActorCard
              key={`${actor.name}-${index}`}
              actor={actor}
              currentYear={currentYear}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Top Cast Members</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowOnlyPopular(!showOnlyPopular)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showOnlyPopular
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {showOnlyPopular ? 'Show All Top 10' : 'Show Popular Only'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <div className="bg-pink-50 rounded-lg p-4">
            <p className="text-lg font-semibold text-pink-600">Top Actresses</p>
            <p className="text-3xl font-bold text-pink-800">{femaleActors.length}</p>
            {showOnlyPopular && (
              <p className="text-sm text-pink-600 mt-1">
                Popularity ≥ {popularityThreshold}
              </p>
            )}
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-lg font-semibold text-blue-600">Top Actors</p>
            <p className="text-3xl font-bold text-blue-800">{maleActors.length}</p>
            {showOnlyPopular && (
              <p className="text-sm text-blue-600 mt-1">
                Popularity ≥ {popularityThreshold}
              </p>
            )}
          </div>
        </div>
      </div>

      {renderCastSection('Top Actresses', femaleActors)}
      {renderCastSection('Top Actors', maleActors)}
    </div>
  );
}