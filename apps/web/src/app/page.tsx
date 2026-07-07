'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  Film,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  Compass,
  Heart,
  Settings,
} from 'lucide-react';
import { GENRES, SERVICES } from '@/app/data/movies';
import { usePreferences } from '@/utils/usePreferences';
import { getRecommendations } from '@/utils/recommend';
import Onboarding from '@/components/Onboarding';
import MovieCard from '@/components/MovieCard';
import MovieDetailModal from '@/components/MovieDetailModal';
import WatchPartyTab from '@/components/WatchPartyTab';

type Tab = 'discover' | 'rated' | 'preferences' | 'party';

async function fetchDiscoverPage({ pageParam, genres }: { pageParam: number; genres: string[] }) {
  const params = new URLSearchParams({ page: String(pageParam) });
  if (genres.length > 0) params.set('genres', genres.join(','));
  const res = await fetch(`/api/movies?${params}`);
  if (!res.ok) throw new Error('Failed to fetch movies');
  return res.json() as Promise<{ movies: any[]; page: number; totalPages: number }>;
}

async function fetchSearch(query: string) {
  const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json() as Promise<{ movies: any[] }>;
}

export default function HomePage() {
  const { prefs, loaded, completeOnboarding, updateGenres, updateServices, rateMovie, reset } =
    usePreferences();
  const [tab, setTab] = useState<Tab>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [greeting, setGreeting] = useState('Good Evening'); // stable default
  const [showHeroModal, setShowHeroModal] = useState(false);
  const isSearching = searchQuery.trim().length >= 2;
  const [mediaCategory, setMediaCategory] = useState<'movies' | 'anime' | 'games'>('movies');

  // Update greeting after mount to avoid hydration mismatch
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Paginated discover feed
  const {
    data: discoverData,
    isLoading: discoverLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error: discoverError,
  } = useInfiniteQuery({
    queryKey: ['movies', prefs.genres],
    queryFn: ({ pageParam }) =>
      fetchDiscoverPage({ pageParam: pageParam as number, genres: prefs.genres }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.totalPages, 8) ? last.page + 1 : undefined,
    enabled: prefs.onboarded && mediaCategory === 'movies',
    staleTime: 5 * 60 * 1000,
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isSearching || mediaCategory !== 'movies' || !hasNextPage || isFetchingNextPage) return;
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isSearching, mediaCategory, fetchNextPage]);

  // Search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => fetchSearch(searchQuery),
    enabled: prefs.onboarded && isSearching && mediaCategory === 'movies',
    staleTime: 60 * 1000,
  });

  // Curated list of popular anime AIDs
  const animeIds = useMemo(() => [262, 410, 7663, 120, 5251, 11608, 1, 4], []);

  // Fetch all curated anime details in parallel
  const { data: animeList, isLoading: animeLoading } = useQuery({
    queryKey: ['anime-picks'],
    queryFn: async () => {
      const results = await Promise.all(
        animeIds.map(async (id) => {
          try {
            const res = await fetch(`/api/anime/${id}`);
            if (!res.ok) return null;
            const item = await res.json();
            return {
              ...item,
              isAnime: true,
              year: item.releaseDate ? item.releaseDate.split('-')[0] : null,
              matchPercent: 90 + (id % 8), 
              reasons: ['AniDB Top Ranked', 'Matches Anime preference'],
            };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: prefs.onboarded && mediaCategory === 'anime',
    staleTime: 10 * 60 * 1000,
  });

  // Curated list of popular game IDs
  const gameIds = useMemo(() => [64591, 313424, 622788, 1273796, 70805, 191843, 267893, 206420], []);

  // Fetch all curated game details in parallel
  const { data: gameList, isLoading: gameLoading } = useQuery({
    queryKey: ['game-picks'],
    queryFn: async () => {
      const results = await Promise.all(
        gameIds.map(async (id) => {
          try {
            const res = await fetch(`/api/games/${id}`);
            if (!res.ok) return null;
            const item = await res.json();
            return {
              ...item,
              id: item.id,
              title: item.title,
              synopsis: item.overview,
              posterPath: item.posterPath,
              backdropPath: item.backdropPath,
              year: item.releaseDate ? item.releaseDate.split('-')[0] : null,
              score: Math.round(item.voteAverage * 10),
              isGame: true,
              matchPercent: 90 + (id % 8),
              reasons: ['High Player Rating', 'Recommended Strategy/RPG'],
            };
          } catch {
            return null;
          }
        })
      );
      return results.filter(Boolean);
    },
    enabled: prefs.onboarded && mediaCategory === 'games' && !isSearching,
    staleTime: 10 * 60 * 1000,
  });

  // Game search results
  const { data: gameSearchData, isLoading: gameSearchLoading } = useQuery({
    queryKey: ['game-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/games?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Game search failed');
      const data = await res.json();
      return data.games.map((g: any) => ({
        ...g,
        isGame: true,
        reasons: ['Search Result'],
      }));
    },
    enabled: prefs.onboarded && isSearching && mediaCategory === 'games',
    staleTime: 60 * 1000,
  });

  // Flatten discover pages then score + sort
  const discoverMovies = useMemo(
    () => discoverData?.pages.flatMap((p) => p.movies) ?? [],
    [discoverData]
  );

  const recommendations = useMemo(
    () => getRecommendations(discoverMovies, prefs),
    [discoverMovies, prefs]
  );

  const searchResults = useMemo(
    () => getRecommendations(searchData?.movies ?? [], prefs),
    [searchData, prefs]
  );

  const activeMovies = isSearching
    ? (mediaCategory === 'games' ? (gameSearchData ?? []) : searchResults)
    : mediaCategory === 'anime'
    ? (animeList ?? [])
    : mediaCategory === 'games'
    ? (gameList ?? [])
    : recommendations;

  const isLoading = isSearching
    ? (mediaCategory === 'games' ? gameSearchLoading : searchLoading)
    : mediaCategory === 'anime'
    ? animeLoading
    : mediaCategory === 'games'
    ? gameLoading
    : discoverLoading;

  const heroMovie = activeMovies[0];
  const restMovies = activeMovies.slice(1);

  // Rated movies tab — uses cached movie data stored when rating
  const ratedMovies = useMemo(() => {
    return Object.entries(prefs.ratings)
      .map(([id, entry]) => {
        const movie = prefs.ratedMovieData?.[id];
        return movie ? { movie, ...entry } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.ratedAt - a.ratedAt) as {
      movie: any;
      rating: 'up' | 'down';
      ratedAt: number;
    }[];
  }, [prefs.ratings, prefs.ratedMovieData]);

  const activeWeights = useMemo(
    () =>
      Object.entries(prefs.genreWeights)
        .filter(([, w]) => w !== 0)
        .sort((a, b) => b[1] - a[1]),
    [prefs.genreWeights]
  );

  if (!loaded)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628]" />
    );
  if (!prefs.onboarded) return <Onboarding onComplete={completeOnboarding} />;

  const likeCount = ratedMovies.filter((r) => r.rating === 'up').length;
  const discoverHeading = isSearching
    ? `Results for "${searchQuery}"`
    : mediaCategory === 'anime'
    ? 'Highly Rated Anime'
    : mediaCategory === 'games'
    ? 'Top Video Games'
    : `${greeting}, Film Lover`;
  const discoverSubtext = isSearching
    ? 'Scored against your taste profile — your preferred genres rank higher.'
    : mediaCategory === 'anime'
    ? 'Curated top-ranked anime fetched directly from AniDB.'
    : mediaCategory === 'games'
    ? 'Discover and purchase video games powered by GameBrain.co.'
    : 'Ranked by your taste profile and streaming availability.';
  const loadMoreLabel = isFetchingNextPage ? 'Loading…' : 'Load more';
  const loadingLabel = isSearching
    ? 'Searching…'
    : mediaCategory === 'anime'
    ? 'Loading AniDB Anime details…'
    : mediaCategory === 'games'
    ? 'Loading GameBrain Game details…'
    : 'Fetching recommendations…';
  const emptyHeading = isSearching ? 'No results found.' : 'Nothing to show yet.';
  const emptySubtext = isSearching
    ? 'Try a different title.'
    : mediaCategory === 'anime'
    ? 'Unable to load anime details.'
    : mediaCategory === 'games'
    ? 'Unable to load video games.'
    : 'Add genres in Preferences to load picks.';

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d2a2a] to-[#0a1628] pb-24 font-inter text-white">
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

      {/* Floating orb decoration */}
      <div className="fixed top-20 left-10 h-64 w-64 rounded-full bg-teal-500/10 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-40 right-10 h-80 w-80 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Glassmorphism header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
              <Film size={16} />
            </span>
            <span className="text-base font-semibold tracking-tight text-white">Reel</span>
          </div>

          {/* Search bar — only shown on Discover */}
          {tab === 'discover' && (
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
              />
              <input
                type="text"
                placeholder={mediaCategory === 'games' ? "Search any game…" : "Search any movie…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm text-white placeholder:text-white/40 backdrop-blur-xl focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-xl">
            <Sparkles size={12} className="text-teal-400" />
            {recommendations.length} picks
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* ── DISCOVER ── */}
        {tab === 'discover' && (
          <section>
            <div className="flex flex-col gap-1 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-white">{discoverHeading}</h1>
              <p className="text-sm font-normal text-white/60">{discoverSubtext}</p>
            </div>

            {/* Category Switcher (only shown when not searching) */}
            {!isSearching && (
              <div className="flex items-center gap-1 mb-8 bg-white/5 border border-white/10 p-1 rounded-full w-fit">
                <button
                  type="button"
                  onClick={() => setMediaCategory('movies')}
                  className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mediaCategory === 'movies'
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => setMediaCategory('anime')}
                  className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mediaCategory === 'anime'
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  Anime (AniDB)
                </button>
                <button
                  type="button"
                  onClick={() => setMediaCategory('games')}
                  className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    mediaCategory === 'games'
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  Games (GameBrain)
                </button>
              </div>
            )}

            {isLoading && (
              <div className="mt-12 flex flex-col items-center gap-3 text-white/60">
                <Loader2 size={24} className="icon-spin" />
                <p className="text-sm">{loadingLabel}</p>
              </div>
            )}

            {!isLoading && discoverError && !isSearching && (
              <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center backdrop-blur-xl">
                <p className="text-sm font-medium text-red-300">Could not load movies.</p>
                <p className="mt-1 text-xs text-red-400">
                  Check that your TMDB_API_KEY is set correctly.
                </p>
              </div>
            )}

            {!isLoading && activeMovies.length === 0 && !discoverError && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
                <p className="text-sm font-medium text-white">{emptyHeading}</p>
                <p className="mt-1 text-sm text-white/60">{emptySubtext}</p>
              </div>
            )}

            {!isLoading && activeMovies.length > 0 && (
              <>
                {/* Hero featured card - now clickable */}
                {heroMovie && !isSearching && (
                  <button
                    type="button"
                    onClick={() => setShowHeroModal(true)}
                    className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl h-96 w-full cursor-pointer transition-all hover:border-white/20 hover:shadow-2xl text-left"
                  >
                    <div className="absolute inset-0">
                      {heroMovie.backdropPath && (
                        <img
                          src={heroMovie.backdropPath.startsWith('http') ? heroMovie.backdropPath : `https://image.tmdb.org/t/p/w1280${heroMovie.backdropPath}`}
                          alt={heroMovie.title}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    </div>
                    <div className="relative z-10 flex h-full flex-col justify-end p-8">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-500/20 px-3 py-1.5 backdrop-blur-xl shadow-lg shadow-teal-500/20 w-fit mb-3">
                        <Sparkles size={12} className="text-teal-300" />
                        <span className="text-xs font-semibold text-teal-200">
                          {heroMovie.matchPercent}% Match · Top Pick
                        </span>
                      </div>
                      <h2 className="text-4xl font-bold text-white mb-2">{heroMovie.title}</h2>
                      <p className="text-base text-white/80 max-w-2xl line-clamp-2 mb-4">
                        {heroMovie.synopsis}
                      </p>
                      <p className="text-xs text-white/50">
                        Click for details, cast, and watch links
                      </p>
                    </div>
                  </button>
                )}

                {/* Movie grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {(isSearching ? activeMovies : restMovies).map((movie: any) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      matchPercent={movie.matchPercent}
                      reasons={movie.reasons}
                      isGame={mediaCategory === 'games' || movie.isGame}
                      rating={prefs.ratings[String(movie.id)]?.rating}
                      onRate={rateMovie}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {!isSearching && mediaCategory === 'movies' && hasNextPage && (
                  <div ref={observerRef} className="mt-8 flex justify-center py-4">
                    {isFetchingNextPage && (
                      <Loader2 size={24} className="animate-spin text-teal-400" />
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── RATED ── */}
        {tab === 'rated' && (
          <section>
            <div className="flex flex-col gap-1 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-white">Your ratings</h1>
              <p className="text-sm font-normal text-white/60">
                Every rating retrains your taste profile. {likeCount} liked,{' '}
                {ratedMovies.length - likeCount} passed.
              </p>
            </div>

            {ratedMovies.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
                <p className="text-sm font-medium text-white">No ratings yet</p>
                <p className="mt-1 text-sm text-white/60">
                  Head to Discover and tell us what you think — your picks will adapt right away.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ratedMovies.map(({ movie, rating }) => (
                  <MovieCard key={movie.id} movie={movie} rating={rating} onRate={rateMovie} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── PREFERENCES ── */}
        {tab === 'preferences' && (
          <section className="max-w-3xl">
            <div className="flex flex-col gap-1 mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-white">Preferences</h1>
              <p className="text-sm font-normal text-white/60">
                Fine-tune the basics anytime. Changes apply instantly.
              </p>
            </div>

            {/* Genres */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl mb-5">
              <div className="flex flex-col gap-1 mb-4">
                <h2 className="text-base font-semibold text-white">Favorite genres</h2>
                <p className="text-sm text-white/60">Tap to add or remove a genre.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => {
                  const active = prefs.genres.includes(genre);
                  const next = active
                    ? prefs.genres.filter((g) => g !== genre)
                    : [...prefs.genres, genre];
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => updateGenres(next)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        active
                          ? 'border-teal-400 bg-teal-400/20 text-teal-300 shadow-lg shadow-teal-500/20'
                          : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Services */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl mb-5">
              <div className="flex flex-col gap-1 mb-4">
                <h2 className="text-base font-semibold text-white">Streaming services</h2>
                <p className="text-sm text-white/60">
                  We prioritize titles available on these services.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SERVICES.map((service) => {
                  const active = prefs.services.includes(service.id);
                  const next = active
                    ? prefs.services.filter((s) => s !== service.id)
                    : [...prefs.services, service.id];
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => updateServices(next)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                        active
                          ? 'border-teal-400 bg-teal-400/20 shadow-lg shadow-teal-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold ${
                          active ? 'bg-teal-500 text-white' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {service.short}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          active ? 'text-teal-300' : 'text-white/70'
                        }`}
                      >
                        {service.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Taste snapshot */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl mb-5">
              <div className="flex flex-col gap-1 mb-4">
                <h2 className="text-base font-semibold text-white">Taste snapshot</h2>
                <p className="text-sm text-white/60">
                  How strongly each genre weighs in your recommendations.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {activeWeights.length > 0 ? (
                  activeWeights.map(([genre, weight]) => (
                    <div key={genre} className="flex items-center justify-between py-1">
                      <span className="text-sm text-white/70">{genre}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (Math.abs(weight) / 10) * 100)}%` }}
                          />
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-white/50 w-12">
                          {weight > 0 ? (
                            <ThumbsUp size={10} className="text-teal-400" />
                          ) : (
                            <ThumbsDown size={10} className="text-white/40" />
                          )}
                          {weight}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/50">Rate a few movies to build your snapshot.</p>
                )}
              </div>
            </div>

            {/* Reset */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-white">Start over</h2>
                <p className="text-sm text-white/60">
                  Clear all preferences and ratings, and run onboarding again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setTab('discover');
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur-xl transition-all hover:bg-white/10"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>
          </section>
        )}

        {/* ── WATCH PARTY ── */}
        {tab === 'party' && (
          <section>
            <WatchPartyTab />
          </section>
        )}
      </main>

      {/* Floating glassmorphism tab bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 p-2 backdrop-blur-xl shadow-2xl">
          <button
            type="button"
            onClick={() => setTab('discover')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              tab === 'discover'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Compass size={16} />
            Discover
          </button>
          <button
            type="button"
            onClick={() => setTab('rated')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              tab === 'rated'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Heart size={16} />
            Rated
          </button>
          <button
            type="button"
            onClick={() => setTab('party')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              tab === 'party'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Sparkles size={16} />
            Watch Party
          </button>
          <button
            type="button"
            onClick={() => setTab('preferences')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              tab === 'preferences'
                ? 'bg-white/20 text-white shadow-lg'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </nav>

      {/* Hero Detail Modal */}
      {showHeroModal && heroMovie && (
        <MovieDetailModal
          movieId={heroMovie.id}
          isAnime={heroMovie.isAnime}
          isGame={mediaCategory === 'games' || heroMovie.isGame}
          onClose={() => setShowHeroModal(false)}
        />
      )}
    </div>
  );
}
