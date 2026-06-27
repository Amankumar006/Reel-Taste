'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp, Sparkles } from 'lucide-react';
import MoviePoster from '@/components/MoviePoster';
import MovieDetailModal from '@/components/MovieDetailModal';
import type { Rating } from '@/utils/usePreferences';

interface MovieCardProps {
  movie: any;
  rating?: Rating;
  matchPercent?: number;
  reasons?: string[];
  onRate: (movie: any, rating: Rating) => void;
}

export default function MovieCard({
  movie,
  rating,
  matchPercent,
  reasons = [],
  onRate,
}: MovieCardProps) {
  const [showModal, setShowModal] = useState(false);
  const upActive = rating === 'up';
  const downActive = rating === 'down';
  const displayScore = movie.score ? (movie.score / 10).toFixed(1) : null;

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.07]">
        {/* Poster with gradient overlay - now clickable */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="relative h-64 overflow-hidden w-full cursor-pointer transition-transform hover:scale-[1.02]"
        >
          <MoviePoster
            title={movie.title}
            posterPath={movie.posterPath}
            className="h-full w-full"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Match % badge */}
          {typeof matchPercent === 'number' && (
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-500/20 px-3 py-1.5 backdrop-blur-xl shadow-lg shadow-teal-500/20">
              <Sparkles size={12} className="text-teal-300" />
              <span className="text-xs font-semibold text-teal-200">{matchPercent}% Match</span>
            </div>
          )}

          {/* TMDB Score badge */}
          {displayScore && (
            <div className="absolute top-3 left-3 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur-xl">
              <span className="text-xs font-semibold text-white">★ {displayScore}</span>
            </div>
          )}
        </button>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-white leading-tight mb-1">
            {movie.title}
            {movie.year && (
              <span className="ml-2 text-sm font-normal text-white/50">({movie.year})</span>
            )}
          </h3>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {movie.genres.slice(0, 3).map((genre: string) => (
                <span
                  key={genre}
                  className="inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/60"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {movie.synopsis && (
            <p className="text-sm text-white/60 leading-relaxed mb-3 line-clamp-2">
              {movie.synopsis}
            </p>
          )}

          {/* Reasons */}
          {reasons.length > 0 && (
            <div className="mb-3 flex flex-col gap-1">
              {reasons.slice(0, 2).map((reason, i) => (
                <p key={i} className="flex items-center gap-1.5 text-xs text-teal-300">
                  <span className="h-1 w-1 rounded-full bg-teal-400" />
                  {reason}
                </p>
              ))}
            </div>
          )}

          {/* Like/Pass buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRate(movie, 'up')}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium backdrop-blur-xl transition-all ${
                upActive
                  ? 'border-teal-400 bg-teal-500/20 text-teal-300 shadow-lg shadow-teal-500/20'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-teal-400/50 hover:bg-teal-500/10'
              }`}
            >
              <ThumbsUp size={14} />
              Like
            </button>
            <button
              type="button"
              onClick={() => onRate(movie, 'down')}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-sm font-medium backdrop-blur-xl transition-all ${
                downActive
                  ? 'border-red-400 bg-red-500/20 text-red-300 shadow-lg shadow-red-500/20'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-red-400/50 hover:bg-red-500/10'
              }`}
            >
              <ThumbsDown size={14} />
              Pass
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && <MovieDetailModal movieId={movie.id} onClose={() => setShowModal(false)} />}
    </>
  );
}
