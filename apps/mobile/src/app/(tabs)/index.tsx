'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Film,
  TrendingUp,
  Layers,
  Grid2x2,
  Info,
} from 'lucide-react-native';
import Transition from 'react-native-screen-transitions';
import { usePreferences } from '@/utils/usePreferences';
import { getRecommendations } from '@/utils/recommend';
import { TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE } from '@/utils/constants';

const BASE = process.env.EXPO_PUBLIC_BASE_URL ?? '';
const { width: SW, height: SH } = Dimensions.get('window');

// Safe fallback for Transition.Pressable if the native transitions module is not present/supported in Expo Go
const TransitionPressable = (Transition as any)?.Pressable || TouchableOpacity;


async function fetchDiscoverPage({ pageParam, genres }: { pageParam: number; genres: string[] }) {
  const url = `${BASE}/api/movies?page=${pageParam}${genres.length > 0 ? `&genres=${genres.join(',')}` : ''}`;
  console.log("MOBILE_DEBUG: fetchDiscoverPage starting", { url });
  try {
    const res = await fetch(url);
    console.log("MOBILE_DEBUG: fetchDiscoverPage status", res.status);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to fetch movies: ${res.status} ${txt}`);
    }
    const data = await res.json();
    console.log("MOBILE_DEBUG: fetchDiscoverPage success, movies count =", data?.movies?.length);
    return data as { movies: any[]; page: number; totalPages: number };
  } catch (err) {
    console.error("MOBILE_DEBUG: fetchDiscoverPage error", err);
    throw err;
  }
}

async function fetchSearch(query: string) {
  const url = `${BASE}/api/movies/search?q=${encodeURIComponent(query)}`;
  console.log("MOBILE_DEBUG: fetchSearch starting", { url });
  try {
    const res = await fetch(url);
    console.log("MOBILE_DEBUG: fetchSearch status", res.status);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const data = await res.json();
    console.log("MOBILE_DEBUG: fetchSearch success, movies count =", data?.movies?.length);
    return data as { movies: any[] };
  } catch (err) {
    console.error("MOBILE_DEBUG: fetchSearch error", err);
    throw err;
  }
}


function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function SkeletonHero() {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, height: 360, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#2dd4bf" />
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={{ flex: 1, marginBottom: 8 }}>
      <View style={{ width: '100%', height: 230, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        <View style={{ width: '48%', height: 32, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ width: '48%', height: 32, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      </View>
    </View>
  );
}


// ── Auto-cycling Hero Carousel ─────────────────────────────────────────────
function HeroCarousel({
  movies,
  onRate,
  onPress,
}: {
  movies: any[];
  onRate: (m: any, r: 'up' | 'down') => void;
  onPress: (m: any) => void;
}) {
  const pool = movies.slice(0, 5);
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pool.length <= 1) return;
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % pool.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [pool.length, fadeAnim]);

  const hero = pool[idx];
  if (!hero) return null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <TransitionPressable sharedBoundTag={`image-${hero.id}`} onPress={() => onPress(hero)}>
          <View style={{ height: 370, borderRadius: 24, overflow: 'hidden' }}>
            {hero.backdropPath ? (
              <Image
                source={{ uri: `${TMDB_BACKDROP_BASE}${hero.backdropPath}` }}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient colors={['#0d2a2a', '#080f1e']} style={{ flex: 1 }} />
            )}
            <LinearGradient
              colors={['rgba(8,15,30,0)', 'rgba(8,15,30,0.4)', 'rgba(8,15,30,0.98)']}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 }}
            />

            {/* Top badges */}
            <View
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(45,212,191,0.45)',
                  backgroundColor: 'rgba(20,184,166,0.2)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 100,
                }}
              >
                <Sparkles size={11} color="#5eead4" />
                <Text style={{ color: '#5eead4', fontSize: 11, fontWeight: '700' }}>
                  {hero.matchPercent}% Match
                </Text>
              </View>
              {hero.score && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: 100,
                  }}
                >
                  <Text style={{ color: '#facc15', fontSize: 11 }}>★</Text>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {(hero.score / 10).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            {/* Bottom */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 28,
                  fontWeight: '800',
                  marginBottom: 6,
                  letterSpacing: -0.5,
                }}
                numberOfLines={2}
              >
                {hero.title}
              </Text>
              {hero.synopsis && (
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.65)',
                    fontSize: 13,
                    lineHeight: 19,
                    marginBottom: 14,
                  }}
                  numberOfLines={2}
                >
                  {hero.synopsis}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    haptic('success');
                    onRate(hero, 'up');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: '#14b8a6',
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 100,
                    shadowColor: '#14b8a6',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.45,
                    shadowRadius: 14,
                  }}
                >
                  <ThumbsUp size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    haptic('light');
                    onRate(hero, 'down');
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    paddingHorizontal: 20,
                    paddingVertical: 11,
                    borderRadius: 100,
                  }}
                >
                  <ThumbsDown size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onPress(hero)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.14)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    paddingVertical: 11,
                    borderRadius: 100,
                  }}
                >
                  <Text
                    style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600' }}
                  >
                    Details
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TransitionPressable>
      </Animated.View>

      {/* Dot indicators */}
      {pool.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {pool.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                haptic('light');
                setIdx(i);
              }}
            >
              <MotiView
                animate={{
                  width: i === idx ? 22 : 6,
                  backgroundColor: i === idx ? '#2dd4bf' : 'rgba(255,255,255,0.22)',
                }}
                transition={{ type: 'timing', duration: 260 }}
                style={{ height: 6, borderRadius: 3 }}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Swipe Card Stack (Tinder-style) ──────────────────────────────────────────
function SwipeStack({
  movies,
  onRate,
  onDetails,
}: {
  movies: any[];
  onRate: (m: any, r: 'up' | 'down') => void;
  onDetails: (m: any) => void;
}) {
  const [cardIdx, setCardIdx] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const CARD_HEIGHT = SH * 0.56;

  const rotate = pan.x.interpolate({
    inputRange: [-220, 0, 220],
    outputRange: ['-13deg', '0deg', '13deg'],
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, 80, 160],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-160, -80, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const nextScale = pan.x.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const dismissCard = useCallback(
    (dir: 'left' | 'right', movie: any) => {
      haptic('success');
      Animated.spring(pan, {
        toValue: { x: dir === 'right' ? SW + 100 : -(SW + 100), y: 0 },
        velocity: 6,
        useNativeDriver: false,
      }).start(() => {
        onRate(movie, dir === 'right' ? 'up' : 'down');
        pan.setValue({ x: 0, y: 0 });
        setCardIdx((i) => i + 1);
      });
    },
    [pan, onRate]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, { dx, vx }) => {
          const movie = movies[cardIdx];
          if (!movie) return;
          if (Math.abs(dx) > 100 || Math.abs(vx) > 0.8) {
            dismissCard(dx > 0 ? 'right' : 'left', movie);
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          }
        },
      }),
    [pan, cardIdx, movies, dismissCard]
  );

  if (cardIdx >= movies.length) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}
      >
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🎉</Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          You've seen them all!
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 15,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          Switch back to Grid to explore more picks.
        </Text>
      </MotiView>
    );
  }

  const current = movies[cardIdx];
  const next = movies[cardIdx + 1];
  const currentImg = current.backdropPath
    ? `${TMDB_BACKDROP_BASE}${current.backdropPath}`
    : current.posterPath
      ? `${TMDB_IMAGE_BASE}${current.posterPath}`
      : '';
  const nextImg = next
    ? next.backdropPath
      ? `${TMDB_BACKDROP_BASE}${next.backdropPath}`
      : next.posterPath
        ? `${TMDB_IMAGE_BASE}${next.posterPath}`
        : ''
    : '';

  return (
    <View style={{ flex: 1 }}>
      {/* Progress */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' }}>
          {cardIdx + 1} / {movies.length}
        </Text>
        <View
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          <MotiView
            animate={{ width: `${(cardIdx / movies.length) * 100}%` as any }}
            transition={{ type: 'timing', duration: 300 }}
            style={{ height: '100%', backgroundColor: '#2dd4bf', borderRadius: 2 }}
          />
        </View>
      </View>

      {/* Cards area */}
      <View style={{ flex: 1, marginHorizontal: 16, marginBottom: 10 }}>
        {/* Next card peeking behind */}
        {next && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 18,
              left: 8,
              right: 8,
              height: CARD_HEIGHT,
              borderRadius: 24,
              overflow: 'hidden',
              transform: [{ scale: nextScale }],
              opacity: 0.65,
            }}
          >
            {nextImg ? (
              <Image
                source={{ uri: nextImg }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <LinearGradient colors={['#0d2a2a', '#080f1e']} style={{ flex: 1 }} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
            />
            <View style={{ position: 'absolute', bottom: 16, left: 16 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                {next.title}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Current card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: CARD_HEIGHT,
            transform: [...pan.getTranslateTransform(), { rotate }],
          }}
        >
          <View style={{ flex: 1, borderRadius: 24, overflow: 'hidden' }}>
            {currentImg ? (
              <Image
                source={{ uri: currentImg }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <LinearGradient colors={['#0d2a2a', '#080f1e']} style={{ flex: 1 }} />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.88)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: CARD_HEIGHT * 0.5,
              }}
            />

            {/* LIKE stamp */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 28,
                left: 24,
                opacity: likeOpacity,
                transform: [{ rotate: '-16deg' }],
              }}
            >
              <View
                style={{
                  borderWidth: 4,
                  borderColor: '#2dd4bf',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{ color: '#2dd4bf', fontSize: 30, fontWeight: '900', letterSpacing: 3 }}
                >
                  LIKE
                </Text>
              </View>
            </Animated.View>

            {/* PASS stamp */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 28,
                right: 24,
                opacity: passOpacity,
                transform: [{ rotate: '16deg' }],
              }}
            >
              <View
                style={{
                  borderWidth: 4,
                  borderColor: '#f87171',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                }}
              >
                <Text
                  style={{ color: '#f87171', fontSize: 30, fontWeight: '900', letterSpacing: 3 }}
                >
                  PASS
                </Text>
              </View>
            </Animated.View>

            {/* Match */}
            {current.matchPercent && (
              <View
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  borderWidth: 1,
                  borderColor: 'rgba(45,212,191,0.4)',
                  backgroundColor: 'rgba(20,184,166,0.22)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 100,
                }}
              >
                <Sparkles size={11} color="#5eead4" />
                <Text style={{ color: '#5eead4', fontSize: 11, fontWeight: '700' }}>
                  {current.matchPercent}%
                </Text>
              </View>
            )}

            {/* Info */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 24,
                  fontWeight: '800',
                  marginBottom: 4,
                  letterSpacing: -0.4,
                }}
                numberOfLines={2}
              >
                {current.title}
              </Text>
              {current.year && (
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 8 }}>
                  {current.year}
                </Text>
              )}
              {current.genres?.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {current.genres.slice(0, 3).map((g: string) => (
                    <View
                      key={g}
                      style={{
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 100,
                      }}
                    >
                      <Text
                        style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' }}
                      >
                        {g}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Action row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          paddingHorizontal: 24,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => dismissCard('left', current)}
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            borderWidth: 2,
            borderColor: 'rgba(248,113,113,0.55)',
            backgroundColor: 'rgba(248,113,113,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#f87171',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
          }}
        >
          <ThumbsDown size={28} color="#f87171" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDetails(current)}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Info size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => dismissCard('right', current)}
          style={{
            width: 66,
            height: 66,
            borderRadius: 33,
            borderWidth: 2,
            borderColor: 'rgba(45,212,191,0.55)',
            backgroundColor: 'rgba(45,212,191,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#2dd4bf',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 14,
          }}
        >
          <ThumbsUp size={28} color="#2dd4bf" />
        </TouchableOpacity>
      </View>
      <Text
        style={{
          color: 'rgba(255,255,255,0.22)',
          fontSize: 12,
          textAlign: 'center',
          paddingBottom: 6,
        }}
      >
        Swipe right to like · left to pass
      </Text>
    </View>
  );
}

// ── Main Discover Screen ──────────────────────────────────────────────────────
type ViewMode = 'grid' | 'swipe';

export default function DiscoverScreen() {
  const router = useRouter();
  const { prefs, loaded, rateMovie } = usePreferences();
  console.log("MOBILE_DEBUG: DiscoverScreen render", { loaded, prefsKeysCount: Object.keys(prefs || {}).length, prefs });
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const isSearching = searchQuery.trim().length >= 2;



  const [mediaCategory, setMediaCategory] = useState<'movies' | 'anime' | 'games'>('movies');

  const {
    data: discoverData,
    isLoading: discoverLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error: discoverError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['movies', prefs.genres],
    queryFn: ({ pageParam }) =>
      fetchDiscoverPage({ pageParam: pageParam as number, genres: prefs.genres }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.totalPages, 8) ? last.page + 1 : undefined,
    enabled: mediaCategory === 'movies',
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => fetchSearch(searchQuery),
    enabled: isSearching && mediaCategory === 'movies',
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
            const res = await fetch(`${BASE}/api/anime/${id}`);
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
    enabled: mediaCategory === 'anime',
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
            const res = await fetch(`${BASE}/api/games/${id}`);
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
    enabled: mediaCategory === 'games' && !isSearching,
    staleTime: 10 * 60 * 1000,
  });

  // Game search results
  const { data: gameSearchData, isLoading: gameSearchLoading } = useQuery({
    queryKey: ['game-search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/games?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Game search failed');
      const data = await res.json();
      return data.games.map((g: any) => ({
        ...g,
        isGame: true,
        reasons: ['Search Result'],
      }));
    },
    enabled: isSearching && mediaCategory === 'games',
    staleTime: 60 * 1000,
  });

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

  const handleMoviePress = useCallback(
    (movie: any) => {
      haptic('light');
      router.push({
        pathname: '/movie/[id]' as any,
        params: {
          id: movie.id,
          tag: `image-${movie.id}`,
          type: movie.isGame ? 'game' : (movie.isAnime ? 'anime' : 'movie')
        },
      });
    },
    [router]
  );

  const handleRate = useCallback(
    (movie: any, rating: 'up' | 'down') => {
      haptic('success');
      rateMovie(movie, rating);
    },
    [rateMovie]
  );

  if (!loaded) {
    return (
      <LinearGradient colors={['#080f1e', '#0d2a2a', '#080f1e']} style={{ flex: 1 }}>
        <StatusBar style="light" />
      </LinearGradient>
    );
  }

  const displayMovies = isSearching || mediaCategory === 'anime' || mediaCategory === 'games' ? activeMovies : activeMovies.slice(1);
  console.log("MOBILE_DEBUG: render UI", {
    BASE,
    isLoading,
    discoverLoading,
    discoverError: discoverError?.message || null,
    discoverMoviesCount: discoverMovies?.length || 0,
    recommendationsCount: recommendations?.length || 0,
    displayMoviesCount: displayMovies?.length || 0,
    activeMoviesCount: activeMovies?.length || 0,
  });

  const renderHeader = () => (
    <View style={{ paddingTop: 12 }}>
      {!isSearching && (
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 80 }}
          style={{ paddingHorizontal: 20, marginBottom: 14 }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1,
            }}
          >
            DISCOVER
          </Text>
          <Text
            style={{
              color: '#fff',
              fontSize: 26,
              fontWeight: '800',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            {mediaCategory === 'anime' ? 'Top Anime' : (mediaCategory === 'games' ? 'Top Games' : (recommendations.length > 0 ? 'Your Picks' : 'Explore Films'))}
          </Text>
        </MotiView>
      )}

      {/* Category switcher */}
      {!isSearching && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            padding: 4,
            borderRadius: 100,
            marginHorizontal: 16,
            marginBottom: 16,
            alignSelf: 'flex-start',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              haptic('light');
              setMediaCategory('movies');
            }}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 7,
              borderRadius: 100,
              backgroundColor: mediaCategory === 'movies' ? '#14b8a6' : 'transparent',
            }}
          >
            <Text
              style={{
                color: mediaCategory === 'movies' ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Movies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptic('light');
              setMediaCategory('anime');
            }}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 7,
              borderRadius: 100,
              backgroundColor: mediaCategory === 'anime' ? '#14b8a6' : 'transparent',
            }}
          >
            <Text
              style={{
                color: mediaCategory === 'anime' ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Anime (AniDB)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              haptic('light');
              setMediaCategory('games');
            }}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 7,
              borderRadius: 100,
              backgroundColor: mediaCategory === 'games' ? '#14b8a6' : 'transparent',
            }}
          >
            <Text
              style={{
                color: mediaCategory === 'games' ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Games (GameBrain)
            </Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* Search */}
      <MotiView
        animate={{ marginHorizontal: searchFocused ? 12 : 16 }}
        transition={{ type: 'spring', damping: 20 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1.5,
          borderColor: searchFocused ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.1)',
          borderRadius: 100,
          paddingHorizontal: 16,
          paddingVertical: 11,
          marginBottom: 16,
          gap: 10,
        }}
      >
        <Search size={16} color={searchFocused ? '#2dd4bf' : 'rgba(255,255,255,0.4)'} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={mediaCategory === 'games' ? "Search any game…" : "Search any movie…"}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={{ flex: 1, color: '#fff', fontSize: 14 }}
        />
        <AnimatePresence>
          {searchQuery.length > 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  haptic('light');
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} color="#fff" />
                </View>
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>
      </MotiView>

      {/* Skeleton */}
      {isLoading && !isSearching && (
        <View>
          <SkeletonHero />
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      )}
      {isLoading && isSearching && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <ActivityIndicator color="#2dd4bf" />
          <Text style={{ color: 'rgba(255,255,255,0.45)', marginTop: 12, fontSize: 13 }}>
            Searching…
          </Text>
        </View>
      )}

      {/* Error */}
      {!isLoading && discoverError && !isSearching && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(248,113,113,0.2)',
            backgroundColor: 'rgba(239,68,68,0.08)',
            padding: 20,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fca5a5', fontSize: 14, fontWeight: '600' }}>
            Could not load movies.
          </Text>
          <Text style={{ color: 'rgba(248,113,113,0.6)', fontSize: 12, marginTop: 4 }}>
            Check that TMDB_API_KEY is set correctly.
          </Text>
        </MotiView>
      )}

      {/* Hero carousel */}
      {!isLoading && !isSearching && mediaCategory === 'movies' && recommendations.length > 0 && (
        <HeroCarousel movies={recommendations} onRate={handleRate} onPress={handleMoviePress} />
      )}

      {/* Section heading */}
      {!isLoading && activeMovies.length > 0 && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 180 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <TrendingUp size={14} color="#2dd4bf" />
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {isSearching ? `Results for "${searchQuery}"` : (mediaCategory === 'anime' ? 'AniDB Picks' : 'More Picks')}
          </Text>
        </MotiView>
      )}

      {/* Empty */}
      {!isLoading && activeMovies.length === 0 && !discoverError && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 }}
        >
          <Text style={{ fontSize: 40, marginBottom: 16 }}>{isSearching ? '🔍' : '🎬'}</Text>
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '700',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {isSearching ? 'No results found.' : 'Nothing to show yet.'}
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 21,
            }}
          >
            {isSearching ? 'Try a different title.' : 'Add genres in Settings to load picks.'}
          </Text>
        </MotiView>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={{ paddingBottom: 24, paddingTop: 12 }}>
      {isFetchingNextPage && (
        <ActivityIndicator size="small" color="#2dd4bf" />
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#080f1e', '#0d2a2a', '#080f1e']} style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.07)',
          backgroundColor: 'rgba(8,15,30,0.94)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#14b8a6',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#14b8a6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        >
          <Film size={17} color="#fff" />
        </View>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4 }}>
          Reel
        </Text>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* Mode toggle */}
          {!isSearching && recommendations.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                haptic('medium');
                setViewMode((v) => (v === 'grid' ? 'swipe' : 'grid'));
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1.5,
                borderColor: viewMode === 'swipe' ? '#2dd4bf' : 'rgba(255,255,255,0.15)',
                backgroundColor:
                  viewMode === 'swipe' ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.05)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 100,
              }}
            >
              {viewMode === 'grid' ? (
                <Layers size={13} color="rgba(255,255,255,0.7)" />
              ) : (
                <Grid2x2 size={13} color="#2dd4bf" />
              )}
              <Text
                style={{
                  color: viewMode === 'swipe' ? '#2dd4bf' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {viewMode === 'grid' ? 'Swipe' : 'Grid'}
              </Text>
            </TouchableOpacity>
          )}
          {recommendations.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                borderWidth: 1,
                borderColor: 'rgba(45,212,191,0.2)',
                backgroundColor: 'rgba(45,212,191,0.07)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 100,
              }}
            >
              <Sparkles size={11} color="#2dd4bf" />
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' }}>
                {recommendations.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Swipe mode */}
      {viewMode === 'swipe' && !isSearching && !isLoading && recommendations.length > 0 ? (
        <SwipeStack movies={recommendations} onRate={handleRate} onDetails={handleMoviePress} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={displayMovies}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}
          columnWrapperStyle={{ gap: 8 }}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          onEndReached={() => {
            if (!isSearching && mediaCategory === 'movies' && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={() => {
                haptic('light');
                refetch();
              }}
              tintColor="#2dd4bf"
            />
          }
          renderItem={({ item: movie, index }) => {
            const myRating = prefs.ratings[String(movie.id)]?.rating;
            return (
              <MotiView
                from={{ opacity: 0, translateY: 24, scale: 0.95 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 18, delay: Math.min(index * 55, 380) }}
                style={{ flex: 1, marginBottom: 8 }}
              >
                <TransitionPressable
                  sharedBoundTag={`image-${movie.id}`}
                  onPress={() => handleMoviePress(movie)}
                  style={{ borderRadius: 16, overflow: 'hidden' }}
                >
                  <View style={{ height: 230 }}>
                    {movie.posterPath ? (
                      <Image
                        source={{ uri: movie.posterPath.startsWith('http') ? movie.posterPath : `${TMDB_IMAGE_BASE}${movie.posterPath}` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Film size={32} color="rgba(255,255,255,0.15)" />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.9)']}
                      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 }}
                    />
                    {movie.matchPercent && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          borderWidth: 1,
                          borderColor: 'rgba(45,212,191,0.35)',
                          backgroundColor: 'rgba(20,184,166,0.22)',
                          paddingHorizontal: 7,
                          paddingVertical: 4,
                          borderRadius: 100,
                        }}
                      >
                        <Sparkles size={9} color="#5eead4" />
                        <Text style={{ color: '#5eead4', fontSize: 10, fontWeight: '700' }}>
                          {movie.matchPercent}%
                        </Text>
                      </View>
                    )}
                    {myRating && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor:
                            myRating === 'up' ? 'rgba(45,212,191,0.92)' : 'rgba(248,113,113,0.92)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {myRating === 'up' ? (
                          <ThumbsUp size={13} color="#fff" />
                        ) : (
                          <ThumbsDown size={13} color="#fff" />
                        )}
                      </View>
                    )}
                    <View
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}
                    >
                      <Text
                        style={{ color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 16 }}
                        numberOfLines={2}
                      >
                        {movie.title}
                      </Text>
                      {movie.year && (
                        <Text
                          style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}
                        >
                          {movie.year}
                        </Text>
                      )}
                    </View>
                  </View>
                </TransitionPressable>
                <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleRate(movie, 'up')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingVertical: 9,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.1)',
                      backgroundColor:
                        myRating === 'up' ? 'rgba(45,212,191,0.14)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <ThumbsUp
                      size={12}
                      color={myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.5)'}
                    />
                    <Text
                      style={{
                        color: myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.5)',
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      Like
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRate(movie, 'down')}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingVertical: 9,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.1)',
                      backgroundColor:
                        myRating === 'down' ? 'rgba(248,113,113,0.14)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <ThumbsDown
                      size={12}
                      color={myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.5)'}
                    />
                    <Text
                      style={{
                        color: myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.5)',
                        fontSize: 11,
                        fontWeight: '600',
                      }}
                    >
                      Pass
                    </Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            );
          }}
        />
      )}
    </LinearGradient>
  );
}
