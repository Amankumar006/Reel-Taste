'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Play, ExternalLink, Calendar, Clock, Star } from 'lucide-react';
import { TMDB_IMAGE_BASE } from '@/app/data/movies';

interface MovieDetailModalProps {
  movieId: number | string;
  isAnime?: boolean;
  isGame?: boolean;
  onClose: () => void;
}

interface MovieDetails {
  id: number;
  title: string;
  tagline: string | null;
  overview: string;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  voteCount: number;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  cast: Array<{ id: number | string; name: string; character: string; profilePath: string | null }>;
  director: { name: string; id: number | string } | null;
  trailer: { key: string; name: string } | null;
  services: Array<{ id: string; name: string; logoPath: string }>;
  // Anime specific
  type?: string;
  episodeCount?: number;
  officialUrl?: string;
  // Game specific
  isGame?: boolean;
  link?: string;
  offers?: Array<{ store_name: string; price: string; url: string }>;
  screenshots?: string[];
  playtimeText?: string;
}

export default function MovieDetailModal({ movieId, isAnime = false, isGame = false, onClose }: MovieDetailModalProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const endpoint = isGame
          ? `/api/games/${movieId}`
          : isAnime
          ? `/api/anime/${movieId}`
          : `/api/movies/${movieId}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to load details');
        const data = await res.json();
        
        // Normalize fields if it's an anime
        if (isAnime) {
          setDetails({
            ...data,
            overview: data.synopsis || '',
            voteAverage: data.score ? data.score / 10 : 0,
            voteCount: data.score ? 1 : 0,
            tagline: data.type ? `${data.type} · ${data.episodeCount || 0} eps` : null,
            services: data.officialUrl ? [{ id: 'official', name: 'Official Site', logoPath: '' }] : [],
          });
        } else if (isGame) {
          setDetails({
            ...data,
            tagline: data.playtimeText || null,
          });
        } else {
          setDetails(data);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load details');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [movieId, isAnime, isGame]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 size={32} className="icon-spin" />
          <p className="text-sm">Loading details…</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .icon-spin {
            animation: spin 0.8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl max-w-md">
          <p className="text-sm font-medium text-white mb-4">{error || 'Details not found'}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-teal-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const releaseYear = details.releaseDate ? details.releaseDate.split('-')[0] : null;
  const runtimeHours = details.runtime ? Math.floor(details.runtime / 60) : 0;
  const runtimeMins = details.runtime ? details.runtime % 60 : 0;
  const runtimeText = details.runtime ? `${runtimeHours}h ${runtimeMins}m` : null;
  const scoreText = details.voteAverage ? details.voteAverage.toFixed(1) : null;

  // Resolve poster and backdrop URLs (AniDB has full URLs, TMDB needs image base)
  const posterUrl = details.posterPath
    ? (details.posterPath.startsWith('http') ? details.posterPath : `${TMDB_IMAGE_BASE}${details.posterPath}`)
    : null;
  const backdropUrl = details.backdropPath
    ? (details.backdropPath.startsWith('http') ? details.backdropPath : `https://image.tmdb.org/t/p/w1280${details.backdropPath}`)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628] overflow-hidden">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-xl transition-all hover:bg-black/60"
          >
            <X size={20} />
          </button>
          
          {/* Backdrop header */}
          {backdropUrl && (
            <div className="relative h-80 overflow-hidden">
              {details.trailer?.key ? (
                <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <iframe
                    src={`https://www.youtube.com/embed/${details.trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${details.trailer.key}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                    className="absolute top-1/2 left-1/2 w-[115%] h-[115%] -translate-x-1/2 -translate-y-1/2 border-0 opacity-50 object-cover scale-[1.35]"
                    allow="autoplay; encrypted-media"
                    title="Cinematic trailer backdrop"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
                </div>
              ) : (
                <>
                  <img
                    src={backdropUrl}
                    alt={details.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="relative -mt-40 px-8 pb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Poster */}
              {posterUrl && (
                <div className="shrink-0 w-48 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                  <img
                    src={posterUrl}
                    alt={details.title}
                    className="w-full h-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{details.title}</h1>
                {details.tagline && (
                  <p className="text-base italic text-white/60 mb-4">"{details.tagline}"</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {releaseYear && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                      <Calendar size={14} />
                      {releaseYear}
                    </span>
                  )}
                  {runtimeText && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                      <Clock size={14} />
                      {runtimeText}
                    </span>
                  )}
                  {scoreText && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-white backdrop-blur-xl">
                      <Star size={14} className="text-yellow-400" fill="currentColor" />
                      {scoreText}
                    </span>
                  )}
                </div>

                {/* Genres */}
                {details.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {details.genres.map((genre) => (
                      <span
                        key={genre}
                        className="inline-block rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                <p className="text-sm text-white/80 leading-relaxed mb-6">{details.overview}</p>

                {/* Director */}
                {details.director && (
                  <p className="text-sm text-white/60 mb-6">
                    <span className="font-semibold text-white/80">{isGame ? 'Developer:' : (isAnime ? 'Director:' : 'Directed by:')}</span>{' '}
                    {details.director.name}
                  </p>
                )}

                {/* Game specific offers */}
                {isGame && details.offers && details.offers.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Where to Buy / Play</h3>
                    <div className="flex flex-wrap gap-2">
                      {details.offers.map((offer, idx) => (
                        <a
                          key={idx}
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-teal-400/50 bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-300 backdrop-blur-xl transition-all hover:bg-teal-500/30 hover:shadow-lg hover:shadow-teal-500/20"
                        >
                          <ExternalLink size={14} />
                          {offer.store_name.toUpperCase()} ({offer.price})
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backlink requirement for GameBrain */}
                {isGame && details.link && (
                  <div className="mb-6 text-xs text-white/40">
                    Data and assets provided by{' '}
                    <a
                      href={details.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      GameBrain.co
                    </a>
                  </div>
                )}

                {/* Watch Now / Links */}
                {isAnime && details.officialUrl && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Official Resource</h3>
                    <a
                      href={details.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-teal-400/50 bg-teal-500/20 px-5 py-2.5 text-sm font-medium text-teal-300 backdrop-blur-xl transition-all hover:bg-teal-500/30 hover:shadow-lg hover:shadow-teal-500/20"
                    >
                      <ExternalLink size={14} />
                      Visit Website
                    </a>
                  </div>
                )}

                {!isAnime && !isGame && details.services.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Watch Now</h3>
                    <div className="flex flex-wrap gap-2">
                      {details.services.map((service) => (
                        <a
                          key={service.id}
                          href={`https://www.themoviedb.org/movie/${details.id}/watch`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-teal-400/50 bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-300 backdrop-blur-xl transition-all hover:bg-teal-500/30 hover:shadow-lg hover:shadow-teal-500/20"
                        >
                          <ExternalLink size={14} />
                          {service.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trailer */}
                {details.trailer && (
                  <div className="mb-6">
                    <a
                      href={`https://www.youtube.com/watch?v=${details.trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500"
                    >
                      <Play size={16} fill="currentColor" />
                      Watch Trailer
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Cast */}
            {details.cast.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Voice Cast / Actors</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {details.cast.map((person) => {
                    const castProfileUrl = person.profilePath
                      ? (person.profilePath.startsWith('http') ? person.profilePath : `https://image.tmdb.org/t/p/w185${person.profilePath}`)
                      : null;
                    return (
                      <div key={person.id} className="text-center">
                        <div className="mb-2 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                          {castProfileUrl ? (
                            <img
                              src={castProfileUrl}
                              alt={person.name}
                              className="w-full h-auto aspect-[2/3] object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-white/5 flex items-center justify-center text-white/40 text-xs">
                              No photo
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white">{person.name}</p>
                        <p className="text-xs text-white/60">{person.character}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
