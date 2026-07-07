'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Copy,
  Plus,
  Users,
  LogOut,
  Heart,
  X,
  RefreshCw,
  Star,
  Check,
  Flame,
  Film,
  Tv,
  Gamepad2,
} from 'lucide-react';
import { TMDB_IMAGE_BASE } from '@/app/data/movies';

// Curated anime IDs and game IDs (matching page.tsx definitions)
const CURATED_ANIME_IDS = [262, 410, 7663, 120, 5251, 11608, 1, 4];
const CURATED_GAME_IDS = [64591, 313424, 622788, 1273796, 70805, 191843, 267893, 206420];

const MOVIE_GENRES = [
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '18', name: 'Drama' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
];

export default function WatchPartyTab() {
  const [userId, setUserId] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [room, setRoom] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Room creation settings
  const [mediaType, setMediaType] = useState<'movies' | 'anime' | 'games'>('movies');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Swiper state
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [swipingLoading, setSwipingLoading] = useState<boolean>(false);

  // Match celebration state
  const [matches, setMatches] = useState<any[]>([]);
  const [showMatchModal, setShowMatchModal] = useState<boolean>(false);
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate persistent anonymous userId on mount
  useEffect(() => {
    let id = localStorage.getItem('rt_party_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('rt_party_user_id', id);
    }
    setUserId(id);

    // Auto-restore previous active room if present
    const savedRoom = localStorage.getItem('rt_party_room_code');
    if (savedRoom) {
      setRoomCode(savedRoom);
    }
  }, []);

  const matchesRef = useRef<any[]>([]);

  // Update matchesRef whenever matches changes
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // Poll room status
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      setMatches([]);
      return;
    }

    let active = true;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/rooms/status?code=${roomCode}`);
        if (!res.ok) {
          if (res.status === 404) {
            handleLeave();
          }
          return;
        }
        const data = await res.json();
        if (!active) return;
        setRoom(data);

        // Detect new matches
        const currentMatches = matchesRef.current;
        if (data.matches && data.matches.length > currentMatches.length) {
          const newMatches = data.matches.filter(
            (m: any) => !currentMatches.some((existing) => existing.mediaId === m.mediaId)
          );
          if (newMatches.length > 0) {
            setLastMatch(newMatches[0]);
            setShowMatchModal(true);
          }
        }
        setMatches(data.matches || []);
      } catch (err) {
        console.error('Lobby polling error:', err);
      }
    }

    void checkStatus();
    const interval = setInterval(checkStatus, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roomCode]);

  // Load cards queue based on room settings
  useEffect(() => {
    if (!room) {
      setQueue([]);
      setCurrentIndex(0);
      return;
    }

    let active = true;
    async function loadQueue() {
      setSwipingLoading(true);
      try {
        let items: any[] = [];

        if (room.mediaType === 'movies') {
          const params = new URLSearchParams();
          if (room.genres && room.genres.length > 0) {
            params.set('genres', room.genres.join(','));
          }
          const res = await fetch(`/api/movies?${params}`);
          if (res.ok) {
            const data = await res.json();
            items = data.movies || [];
          }
        } else if (room.mediaType === 'anime') {
          items = await Promise.all(
            CURATED_ANIME_IDS.map(async (id) => {
              const res = await fetch(`/api/anime/${id}`);
              if (!res.ok) return null;
              const data = await res.json();
              return {
                ...data,
                id: data.id,
                title: data.title,
                synopsis: data.synopsis || data.overview,
                posterPath: data.posterPath,
                backdropPath: data.backdropPath,
                year: data.releaseDate ? data.releaseDate.split('-')[0] : null,
                score: Math.round(data.score / 10),
                isAnime: true,
              };
            })
          );
        } else if (room.mediaType === 'games') {
          items = await Promise.all(
            CURATED_GAME_IDS.map(async (id) => {
              const res = await fetch(`/api/games/${id}`);
              if (!res.ok) return null;
              const data = await res.json();
              return {
                ...data,
                id: data.id,
                title: data.title,
                synopsis: data.overview,
                posterPath: data.posterPath,
                backdropPath: data.backdropPath,
                year: data.releaseDate ? data.releaseDate.split('-')[0] : null,
                score: Math.round(data.voteAverage * 10),
                isGame: true,
              };
            })
          );
        }

        if (active) {
          setQueue(items.filter(Boolean));
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Queue loading error:', err);
      } finally {
        if (active) setSwipingLoading(false);
      }
    }

    void loadQueue();
    return () => {
      active = false;
    };
  }, [room]);

  // Create Room
  const handleCreateRoom = async () => {
    if (!userId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mediaType,
          genres: selectedGenres,
        }),
      });
      if (!res.ok) throw new Error('Failed to create watch party');
      const data = await res.json();
      setRoomCode(data.code);
      setRoom(data);
      localStorage.setItem('rt_party_room_code', data.code);
    } catch (err: any) {
      setError(err.message || 'Error creating room');
    } finally {
      setActionLoading(false);
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    if (!userId || !inputCode) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code: inputCode,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join watch party');
      }
      const data = await res.json();
      setRoomCode(data.code);
      setRoom(data);
      localStorage.setItem('rt_party_room_code', data.code);
    } catch (err: any) {
      setError(err.message || 'Error joining room');
    } finally {
      setActionLoading(false);
    }
  };

  // Leave Room
  const handleLeave = () => {
    setRoomCode('');
    setRoom(null);
    setInputCode('');
    setMatches([]);
    setQueue([]);
    localStorage.removeItem('rt_party_room_code');
  };

  // Swipe Action
  const handleSwipe = async (rating: 'up' | 'down') => {
    const item = queue[currentIndex];
    if (!item || !roomCode || !userId) return;

    // Proceed optimistic index change instantly
    setCurrentIndex((prev) => prev + 1);

    try {
      const res = await fetch('/api/rooms/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: roomCode,
          userId,
          mediaId: item.id,
          rating,
          title: item.title,
          posterPath: item.posterPath,
          backdropPath: item.backdropPath,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.match) {
          setLastMatch(data.movie);
          setShowMatchModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to submit swipe:', err);
    }
  };

  // Reset Session
  const handleResetSession = async () => {
    if (!roomCode) return;
    if (!confirm('Are you sure you want to reset all swipes and matches for this room?')) return;
    try {
      await fetch('/api/rooms/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode }),
      });
      setMatches([]);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCard = queue[currentIndex];

  // Resolve active card URLs
  const activePoster = activeCard?.posterPath
    ? activeCard.posterPath.startsWith('http')
      ? activeCard.posterPath
      : `${TMDB_IMAGE_BASE}${activeCard.posterPath}`
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Dynamic Match Celebration Modal Overlay */}
      {showMatchModal && lastMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="relative text-center p-8 max-w-lg rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-950/40 via-[#0a1628] to-[#0a1628] shadow-[0_0_50px_rgba(20,184,166,0.25)] animate-scale-up">
            <div className="mx-auto w-20 h-20 bg-teal-500/10 border border-teal-500/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Flame className="w-10 h-10 text-teal-400 fill-teal-500/10" />
            </div>
            
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">It's a Match!</h2>
            <p className="text-teal-400 font-semibold mb-6">You and your friend both liked this!</p>

            {lastMatch.posterPath && (
              <div className="relative w-56 h-80 mx-auto rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl mb-6">
                <img
                  src={
                    lastMatch.posterPath.startsWith('http')
                      ? lastMatch.posterPath
                      : `${TMDB_IMAGE_BASE}${lastMatch.posterPath}`
                  }
                  alt={lastMatch.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h3 className="text-2xl font-bold text-white mb-6">{lastMatch.title}</h3>

            <button
              onClick={() => setShowMatchModal(false)}
              className="rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/20 hover:scale-105 transition-all"
            >
              Keep Swiping
            </button>
          </div>
        </div>
      )}

      {/* Screen title */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-teal-400" /> Watch Party Lobby
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Create a private room, swipe on choices with a friend, and match instantly.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* LOBBY ENTRY FORM */}
      {!roomCode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Lobby Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-400" /> Host a Party
              </h2>
              <p className="text-sm text-white/60 mb-6">
                Generate a custom room code and configure your streaming preferences.
              </p>

              {/* Media type picker */}
              <div className="mb-6">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
                  Media Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMediaType('movies');
                      setSelectedGenres([]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-semibold ${
                      mediaType === 'movies'
                        ? 'border-teal-500/50 bg-teal-500/10 text-white'
                        : 'border-white/10 bg-transparent text-white/60'
                    }`}
                  >
                    <Film className="w-4 h-4" /> Movies
                  </button>
                  <button
                    onClick={() => {
                      setMediaType('anime');
                      setSelectedGenres([]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-semibold ${
                      mediaType === 'anime'
                        ? 'border-teal-500/50 bg-teal-500/10 text-white'
                        : 'border-white/10 bg-transparent text-white/60'
                    }`}
                  >
                    <Tv className="w-4 h-4" /> Anime
                  </button>
                  <button
                    onClick={() => {
                      setMediaType('games');
                      setSelectedGenres([]);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-semibold ${
                      mediaType === 'games'
                        ? 'border-teal-500/50 bg-teal-500/10 text-white'
                        : 'border-white/10 bg-transparent text-white/60'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" /> Games
                  </button>
                </div>
              </div>

              {/* Genre filtering (for Movies only) */}
              {mediaType === 'movies' && (
                <div className="mb-6">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
                    Filter by Genres
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOVIE_GENRES.map((genre) => {
                      const active = selectedGenres.includes(genre.id);
                      return (
                        <button
                          key={genre.id}
                          onClick={() => {
                            if (active) {
                              setSelectedGenres(selectedGenres.filter((id) => id !== genre.id));
                            } else {
                              setSelectedGenres([...selectedGenres, genre.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                            active
                              ? 'border-teal-500/40 bg-teal-500/10 text-white'
                              : 'border-white/10 bg-transparent text-white/60 hover:border-white/20'
                          }`}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={actionLoading}
              className="w-full mt-6 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 py-4 font-bold text-white transition-all hover:scale-[1.02] shadow-lg shadow-teal-500/10 disabled:opacity-50"
            >
              {actionLoading ? 'Creating Room…' : 'Generate Room Code'}
            </button>
          </div>

          {/* Join Lobby Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" /> Join Room
              </h2>
              <p className="text-sm text-white/60 mb-6">
                Enter an existing watch party room code shared by your friend.
              </p>

              <div className="mb-6">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
                  Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="EX: LBY8K9"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center text-2xl font-black uppercase tracking-widest text-white outline-none focus:border-teal-500/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={actionLoading || !inputCode}
              className="w-full rounded-2xl bg-white text-black py-4 font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {actionLoading ? 'Joining Room…' : 'Enter Party Lobby'}
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE PARTY LOBBY SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls & Sync Side Bar */}
          <div className="lg:col-span-1 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl h-fit flex flex-col gap-6">
            <div>
              <span className="text-[10px] font-bold text-teal-400 tracking-widest uppercase bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">
                Active Room
              </span>
              <div className="flex items-center gap-3 mt-4">
                <h2 className="text-3xl font-black text-white tracking-wider">{roomCode}</h2>
                <button
                  onClick={copyInvite}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                  title="Copy Invite Code"
                >
                  {copied ? <Check size={16} className="text-teal-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Players connectivity indicators */}
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                Room Members
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-semibold text-white/80">Host ({room?.hostId === userId ? 'You' : 'Friend'})</span>
                </div>
                <div className="flex items-center gap-2">
                  {room?.memberId ? (
                    <>
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      <span className="text-sm font-semibold text-white/80">Guest ({room?.memberId === userId ? 'You' : 'Friend'})</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-sm text-white/40 italic">Waiting for guest to join…</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Selected Preferences Summary */}
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
                Room Category
              </h3>
              <p className="text-sm font-bold text-white capitalize">{room?.mediaType}</p>
              {room?.genres && room.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {room.genres.map((gid: string) => {
                    const matched = MOVIE_GENRES.find((g) => g.id === gid);
                    return (
                      <span
                        key={gid}
                        className="px-2 py-0.5 rounded-md border border-white/5 bg-white/5 text-[10px] text-white/50"
                      >
                        {matched?.name || gid}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Room Matches List */}
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
                Matches ({matches.length})
              </h3>
              {matches.length === 0 ? (
                <p className="text-xs text-white/40 italic">No matches in this session yet.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {matches.map((m: any) => (
                    <div
                      key={m.mediaId}
                      className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5"
                    >
                      {m.posterPath && (
                        <img
                          src={
                            m.posterPath.startsWith('http')
                              ? m.posterPath
                              : `${TMDB_IMAGE_BASE}${m.posterPath}`
                          }
                          alt={m.title}
                          className="w-10 h-14 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{m.title}</p>
                        <span className="text-[10px] text-teal-400 font-semibold flex items-center gap-1">
                          <Flame size={10} className="fill-teal-400" /> Matched!
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lobby actions */}
            <div className="border-t border-white/10 pt-5 flex gap-2">
              <button
                onClick={handleResetSession}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-transparent text-white/60 hover:text-white hover:border-white/20 transition-all text-xs font-semibold"
              >
                <RefreshCw size={12} /> Reset Lobby
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-950/40 transition-all text-xs font-semibold"
              >
                <LogOut size={12} /> Leave Room
              </button>
            </div>
          </div>

          {/* Co-Swipe Card deck swiping section */}
          <div className="lg:col-span-2 flex flex-col items-center">
            {/* If waiting for guest, display loading instruction */}
            {!room?.memberId ? (
              <div className="w-full max-w-md aspect-[3/4] rounded-3xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
                <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6 animate-bounce">
                  <Users className="w-8 h-8 text-teal-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Invite a Friend</h3>
                <p className="text-sm text-white/50 leading-relaxed mb-6">
                  This party is waiting for a guest. Share your room code at the top to sync feeds and swipe together!
                </p>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-6 py-3 rounded-2xl w-full justify-between">
                  <span className="text-xl font-black text-white tracking-widest">{roomCode}</span>
                  <button
                    onClick={copyInvite}
                    className="text-xs text-teal-400 font-semibold uppercase flex items-center gap-1 hover:text-teal-300 transition-all"
                  >
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
              </div>
            ) : swipingLoading ? (
              <div className="w-full max-w-md aspect-[3/4] rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center p-8 backdrop-blur-xl text-white">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
              </div>
            ) : !activeCard ? (
              <div className="w-full max-w-md aspect-[3/4] rounded-3xl border border-white/10 bg-white/5 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl text-white">
                <div className="text-5xl mb-4">🎬</div>
                <h3 className="text-xl font-bold mb-2">End of Queue!</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  You've swiped on all currently loaded items. Use the "Reset Lobby" button on the sidebar to swipe again!
                </p>
              </div>
            ) : (
              /* THE SWIPER CARD WRAPPER */
              <div className="w-full max-w-md flex flex-col gap-6">
                {/* Active Card Body */}
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-[#0a1628] shadow-2xl flex flex-col justify-end p-6 group">
                  {/* YouTube Trailer Cinematic Backdrop */}
                  {activeCard.trailer?.key ? (
                    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <iframe
                        src={`https://www.youtube.com/embed/${activeCard.trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${activeCard.trailer.key}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                        className="absolute top-1/2 left-1/2 w-[125%] h-[125%] -translate-x-1/2 -translate-y-1/2 border-0 opacity-40 scale-[1.35]"
                        allow="autoplay; encrypted-media"
                        title="Card cinematic trailer backdrop"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
                    </div>
                  ) : activeCard.backdropPath ? (
                    /* Fallback Backdrop */
                    <div className="absolute inset-0 z-0">
                      <img
                        src={
                          activeCard.backdropPath.startsWith('http')
                            ? activeCard.backdropPath
                            : `https://image.tmdb.org/t/p/w1280${activeCard.backdropPath}`
                        }
                        alt={activeCard.title}
                        className="w-full h-full object-cover opacity-30"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/60 to-transparent" />
                    </div>
                  ) : null}

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                  {/* Top-Right Score Badge */}
                  {activeCard.score ? (
                    <div className="absolute top-4 right-4 z-20 inline-flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-950/60 px-3.5 py-1.5 text-sm font-black text-teal-400 backdrop-blur-xl">
                      <Star size={14} className="text-teal-400 fill-teal-400" />
                      {activeCard.score}
                    </div>
                  ) : activeCard.voteAverage ? (
                    <div className="absolute top-4 right-4 z-20 inline-flex items-center gap-1 rounded-full border border-teal-500/20 bg-teal-950/60 px-3.5 py-1.5 text-sm font-black text-teal-400 backdrop-blur-xl">
                      <Star size={14} className="text-teal-400 fill-teal-400" />
                      {activeCard.voteAverage.toFixed(1)}
                    </div>
                  ) : null}

                  {/* Poster Thumbnail Layered Overlay */}
                  <div className="relative z-20 flex gap-4 items-end mb-4">
                    {activePoster && (
                      <div className="w-24 shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                        <img
                          src={activePoster}
                          alt={activeCard.title}
                          className="w-full h-auto"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div>
                      {activeCard.year && (
                        <span className="text-xs text-white/50 font-bold">{activeCard.year}</span>
                      )}
                      <h3 className="text-2xl font-black text-white leading-tight tracking-tight mt-0.5">
                        {activeCard.title}
                      </h3>
                    </div>
                  </div>

                  {/* Synopsis Text */}
                  <p className="relative z-20 text-xs text-white/70 leading-relaxed line-clamp-3 mb-2">
                    {activeCard.synopsis || activeCard.overview}
                  </p>

                  {/* Card genres */}
                  {activeCard.genres && activeCard.genres.length > 0 && (
                    <div className="relative z-20 flex flex-wrap gap-1 mt-2">
                      {activeCard.genres.slice(0, 3).map((g: string) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-semibold text-white/60"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Swiper Controls Action Panel */}
                <div className="flex justify-center gap-6">
                  {/* Pass Button */}
                  <button
                    onClick={() => handleSwipe('down')}
                    className="w-16 h-16 rounded-full border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 text-red-500 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <X size={28} />
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={() => handleSwipe('up')}
                    className="w-16 h-16 rounded-full border border-teal-500/20 bg-teal-950/10 hover:bg-teal-950/20 text-teal-400 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Heart size={28} className="fill-teal-400/10" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
