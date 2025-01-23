import React, { useState } from 'react';
import { Copy, Check, Star, TrendingUp } from 'lucide-react';
import { ActorInfo } from '../types';

interface ActorCardProps {
  actor: ActorInfo;
  currentYear: number;
}

export function ActorCard({ actor, currentYear }: ActorCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const calculateAge = (birthYear: number, year: number) => {
    if (!birthYear || !year) return 'Unknown';
    return year - birthYear;
  };

  const handleCopyAges = async () => {
    const ageText = `${actor.name}:
Age in ${actor.movieYear}: ${calculateAge(actor.birthYear, actor.movieYear)}
Current age: ${calculateAge(actor.birthYear, currentYear)}`;
    
    try {
      await navigator.clipboard.writeText(ageText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const isPopular = actor.popularity > 20;
  const isFemale = actor.gender === 1;
  const isActor = actor.known_for_department === 'Acting';

  return (
    <div className={`bg-white rounded-lg shadow-xl overflow-hidden transform hover:scale-105 transition-transform duration-200 ${
      isPopular && isFemale && isActor ? 'ring-2 ring-pink-400' : ''
    }`}>
      <div className="aspect-[3/4] relative">
        <img
          src={actor.imageUrl}
          alt={actor.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/500x750?text=No+Image+Available';
          }}
        />
        {isPopular && (
          <div className="absolute top-2 right-2 bg-pink-500 text-white px-2 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1">
            <Star className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Popular</span>
          </div>
        )}
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 line-clamp-2">
            {actor.name}
          </h3>
          {actor.popularity > 0 && (
            <div className="flex items-center text-xs sm:text-sm text-gray-600 ml-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {actor.popularity.toFixed(1)}
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 italic line-clamp-2">{actor.role}</p>
        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
          <p>
            Age in {actor.movieYear}:{' '}
            <span className="font-semibold text-indigo-600">
              {calculateAge(actor.birthYear, actor.movieYear)}
            </span>
          </p>
          <p>
            Current age:{' '}
            <span className="font-semibold text-indigo-600">
              {calculateAge(actor.birthYear, currentYear)}
            </span>
          </p>
        </div>
        <button
          onClick={handleCopyAges}
          className="mt-3 sm:mt-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {isCopied ? (
            <>
              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
              Copy Ages
            </>
          )}
        </button>
      </div>
    </div>
  );
}