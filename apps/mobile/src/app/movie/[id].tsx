'use client';

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Clock,
  Calendar,
  Play,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  User,
  Bookmark,
} from 'lucide-react-native';
import Transition from 'react-native-screen-transitions';
import { useQuery } from '@tanstack/react-query';
import { usePreferences } from '@/utils/usePreferences';
import { useWatchlist } from '@/utils/useWatchlist';
import { TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE, TMDB_CAST_BASE } from '@/utils/constants';

const BASE = process.env.EXPO_PUBLIC_BASE_URL ?? '';

async function fetchMovieDetails(id: string) {
  const res = await fetch(`${BASE}/api/movies/${id}`);
  if (!res.ok) throw new Error('Failed to load movie details');
  return res.json();
}

function haptic(type: 'light' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// ── Animated Score Ring ────────────────────────────────────────────────────────
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 10, 1);
  const strokeDashoffset = circumference * (1 - pct);
  const color = pct >= 0.7 ? '#2dd4bf' : pct >= 0.5 ? '#facc15' : '#f87171';
  const bgColor =
    pct >= 0.7
      ? 'rgba(45,212,191,0.1)'
      : pct >= 0.5
        ? 'rgba(250,204,21,0.1)'
        : 'rgba(248,113,113,0.1)';

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        borderRadius: size / 2,
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute' }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={5}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={5}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color, fontSize: 20, fontWeight: '800', lineHeight: 22 }}>
          {score.toFixed(1)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '600' }}>/10</Text>
      </View>
    </View>
  );
}

export default function MovieDetailScreen() {
  const { id, tag } = useLocalSearchParams<{ id: string; tag: string }>();
  const router = useRouter();
  const { prefs, rateMovie } = usePreferences();
  const { toggle: toggleWatchlist, isInWatchlist } = useWatchlist();
  const insets = useSafeAreaInsets();
  const sharedBoundTag = tag ?? `image-${id}`;

  const [showUI, setShowUI] = useState(false);
  const uiOpacity = useRef(new Animated.Value(0)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      setShowUI(true);
      Animated.timing(uiOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }, 420);
    return () => clearTimeout(t);
  }, [uiOpacity]);

  const {
    data: movie,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['movie-detail', id],
    queryFn: () => fetchMovieDetails(id),
    staleTime: 10 * 60 * 1000,
  });

  const myRating = prefs.ratings[String(id)]?.rating;
  const inWatchlist = isInWatchlist(id);
  const runtimeText = movie?.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;
  const releaseYear = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  const handleWatchlistToggle = () => {
    haptic('success');
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(bookmarkScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    if (movie) toggleWatchlist(movie);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#080f1e' }}>
      <StatusBar style="light" />

      {/* Shared element hero */}
      <Transition.View sharedBoundTag={sharedBoundTag} style={{ width: '100%', height: 440 }}>
        {movie?.backdropPath ? (
          <Image
            source={{ uri: `${TMDB_BACKDROP_BASE}${movie.backdropPath}` }}
            style={{ width: '100%', height: 440 }}
            contentFit="cover"
          />
        ) : movie?.posterPath ? (
          <Image
            source={{ uri: `${TMDB_IMAGE_BASE}${movie.posterPath}` }}
            style={{ width: '100%', height: 440 }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient colors={['#0d2a2a', '#080f1e']} style={{ width: '100%', height: 440 }} />
        )}
        <LinearGradient
          colors={['rgba(8,15,30,0)', 'rgba(8,15,30,0.6)', 'rgba(8,15,30,1)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }}
        />
      </Transition.View>

      {/* Back button + Watchlist button */}
      {showUI && (
        <Animated.View
          style={{
            position: 'absolute',
            top: insets.top + 10,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            opacity: uiOpacity,
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              haptic('light');
              router.back();
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <TouchableOpacity
              onPress={handleWatchlistToggle}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: inWatchlist ? 'rgba(45,212,191,0.25)' : 'rgba(0,0,0,0.55)',
                borderWidth: 1,
                borderColor: inWatchlist ? 'rgba(45,212,191,0.6)' : 'rgba(255,255,255,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bookmark
                size={20}
                color={inWatchlist ? '#2dd4bf' : '#fff'}
                fill={inWatchlist ? '#2dd4bf' : 'transparent'}
              />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}

      <ScrollView
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentContainerStyle={{ paddingTop: 350, paddingBottom: insets.bottom + 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Skeleton */}
        {isLoading && (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <Skeleton colorMode="dark" width="70%" height={32} radius={8} />
            <Skeleton colorMode="dark" width="45%" height={20} radius={6} />
            <View style={{ height: 12 }} />
            <Skeleton colorMode="dark" width="100%" height={14} radius={4} />
            <Skeleton colorMode="dark" width="90%" height={14} radius={4} />
            <Skeleton colorMode="dark" width="75%" height={14} radius={4} />
          </View>
        )}

        {/* Error */}
        {error && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              marginHorizontal: 20,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: 'rgba(248,113,113,0.2)',
              backgroundColor: 'rgba(239,68,68,0.08)',
              padding: 24,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 10 }}>⚠️</Text>
            <Text
              style={{ color: '#fca5a5', fontSize: 15, fontWeight: '600', textAlign: 'center' }}
            >
              Could not load movie details.
            </Text>
          </MotiView>
        )}

        {movie && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 320, delay: 100 }}
            style={{ paddingHorizontal: 20 }}
          >
            {/* Poster + Title + Score ring */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
              {movie.posterPath && (
                <View
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.6,
                    shadowRadius: 20,
                  }}
                >
                  <Image
                    source={{ uri: `${TMDB_IMAGE_BASE}${movie.posterPath}` }}
                    style={{ width: 108, height: 162 }}
                    contentFit="cover"
                  />
                </View>
              )}
              <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 4 }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '800',
                    lineHeight: 28,
                    marginBottom: 6,
                    letterSpacing: -0.4,
                  }}
                >
                  {movie.title}
                </Text>
                {movie.tagline && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.45)',
                      fontSize: 12,
                      fontStyle: 'italic',
                      marginBottom: 10,
                    }}
                  >
                    "{movie.tagline}"
                  </Text>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {releaseYear && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 100,
                      }}
                    >
                      <Calendar size={11} color="rgba(255,255,255,0.45)" />
                      <Text
                        style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600' }}
                      >
                        {releaseYear}
                      </Text>
                    </View>
                  )}
                  {runtimeText && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 100,
                      }}
                    >
                      <Clock size={11} color="rgba(255,255,255,0.45)" />
                      <Text
                        style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600' }}
                      >
                        {runtimeText}
                      </Text>
                    </View>
                  )}
                </View>
                {/* Score ring */}
                {movie.voteAverage > 0 && (
                  <MotiView
                    from={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 400 }}
                  >
                    <ScoreRing score={movie.voteAverage} size={76} />
                  </MotiView>
                )}
              </View>
            </View>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {movie.genres.map((g: string) => (
                  <View
                    key={g}
                    style={{
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 100,
                    }}
                  >
                    <Text
                      style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600' }}
                    >
                      {g}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Like / Pass */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => {
                  haptic('success');
                  rateMovie(movie, 'up');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 15,
                  borderRadius: 100,
                  borderWidth: 1.5,
                  borderColor: myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.12)',
                  backgroundColor:
                    myRating === 'up' ? 'rgba(45,212,191,0.16)' : 'rgba(255,255,255,0.05)',
                  shadowColor: myRating === 'up' ? '#14b8a6' : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 14,
                }}
              >
                <ThumbsUp
                  size={17}
                  color={myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.65)'}
                />
                <Text
                  style={{
                    color: myRating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.65)',
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Like
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  haptic('success');
                  rateMovie(movie, 'down');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 15,
                  borderRadius: 100,
                  borderWidth: 1.5,
                  borderColor: myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.12)',
                  backgroundColor:
                    myRating === 'down' ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <ThumbsDown
                  size={17}
                  color={myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.65)'}
                />
                <Text
                  style={{
                    color: myRating === 'down' ? '#f87171' : 'rgba(255,255,255,0.65)',
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Pass
                </Text>
              </TouchableOpacity>
            </View>

            {/* Overview */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.78)',
                fontSize: 14,
                lineHeight: 24,
                marginBottom: 20,
              }}
            >
              {movie.overview}
            </Text>

            {/* Director */}
            {movie.director && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 24,
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(45,212,191,0.12)',
                    borderWidth: 1,
                    borderColor: 'rgba(45,212,191,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={16} color="#2dd4bf" />
                </View>
                <View>
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                    }}
                  >
                    DIRECTOR
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 1 }}>
                    {movie.director.name}
                  </Text>
                </View>
              </View>
            )}

            {/* Watch Now */}
            {movie.services?.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
                  Watch Now
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {movie.services.map((service: any, i: number) => (
                    <MotiView
                      key={service.id}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: i * 60 }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          haptic('light');
                          Linking.openURL(`https://www.themoviedb.org/movie/${movie.id}/watch`);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 7,
                          borderWidth: 1.5,
                          borderColor: 'rgba(45,212,191,0.45)',
                          backgroundColor: 'rgba(20,184,166,0.12)',
                          paddingHorizontal: 16,
                          paddingVertical: 11,
                          borderRadius: 100,
                        }}
                      >
                        <ExternalLink size={13} color="#5eead4" />
                        <Text style={{ color: '#5eead4', fontSize: 13, fontWeight: '700' }}>
                          {service.name}
                        </Text>
                      </TouchableOpacity>
                    </MotiView>
                  ))}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 8 }}>
                  Opens TMDB's watch page with direct platform links
                </Text>
              </View>
            )}

            {/* Trailer */}
            {movie.trailer && (
              <View style={{ marginBottom: 32 }}>
                <TouchableOpacity
                  onPress={() => {
                    haptic('light');
                    Linking.openURL(`https://www.youtube.com/watch?v=${movie.trailer.key}`);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#dc2626',
                    paddingHorizontal: 24,
                    paddingVertical: 15,
                    borderRadius: 100,
                    alignSelf: 'flex-start',
                    shadowColor: '#dc2626',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.38,
                    shadowRadius: 16,
                  }}
                >
                  <Play size={17} color="#fff" fill="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                    Watch Trailer
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cast */}
            {movie.cast?.length > 0 && (
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16 }}>
                  Cast
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0 }}
                  contentContainerStyle={{ gap: 14, paddingRight: 4 }}
                >
                  {movie.cast.slice(0, 10).map((person: any, i: number) => (
                    <MotiView
                      key={person.id}
                      from={{ opacity: 0, translateY: 16 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'spring', delay: i * 50 }}
                      style={{ width: 80, alignItems: 'center' }}
                    >
                      <View
                        style={{
                          width: 76,
                          height: 106,
                          borderRadius: 14,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.1)',
                          marginBottom: 8,
                        }}
                      >
                        {person.profilePath ? (
                          <Image
                            source={{ uri: `${TMDB_CAST_BASE}${person.profilePath}` }}
                            style={{ width: 76, height: 106 }}
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
                            <User size={28} color="rgba(255,255,255,0.2)" />
                          </View>
                        )}
                      </View>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: '700',
                          textAlign: 'center',
                          lineHeight: 14,
                        }}
                        numberOfLines={2}
                      >
                        {person.name}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.38)',
                          fontSize: 9,
                          textAlign: 'center',
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {person.character}
                      </Text>
                    </MotiView>
                  ))}
                </ScrollView>
              </View>
            )}
          </MotiView>
        )}
      </ScrollView>
    </View>
  );
}
