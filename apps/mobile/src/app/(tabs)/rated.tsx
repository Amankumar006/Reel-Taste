'use client';

import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ThumbsUp,
  ThumbsDown,
  Film,
  Heart,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react-native';
import { usePreferences } from '@/utils/usePreferences';
import { TMDB_IMAGE_BASE } from '@/utils/constants';

const TransitionPressable = ({ sharedBoundTag, ...props }: any) => <TouchableOpacity {...props} />;


type Filter = 'all' | 'liked' | 'passed';
type SortBy = 'recent' | 'az';
type ViewMode = 'list' | 'grid';

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

export default function RatedScreen() {
  const router = useRouter();
  const { prefs, rateMovie } = usePreferences();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

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

  const likeCount = ratedMovies.filter((r) => r.rating === 'up').length;
  const passCount = ratedMovies.length - likeCount;
  const likeRatio = ratedMovies.length > 0 ? Math.round((likeCount / ratedMovies.length) * 100) : 0;

  const filtered = useMemo(() => {
    let result =
      filter === 'all'
        ? ratedMovies
        : filter === 'liked'
          ? ratedMovies.filter((r) => r.rating === 'up')
          : ratedMovies.filter((r) => r.rating === 'down');
    if (sortBy === 'az')
      result = [...result].sort((a, b) => a.movie.title.localeCompare(b.movie.title));
    return result;
  }, [ratedMovies, filter, sortBy]);

  const goToMovie = (movie: any) => {
    haptic();
    router.push({
      pathname: '/movie/[id]' as any,
      params: { id: movie.id, tag: `image-${movie.id}` },
    });
  };

  return (
    <LinearGradient colors={['#080f1e', '#0d2a2a', '#080f1e']} style={{ flex: 1 }}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.07)',
          backgroundColor: 'rgba(8,15,30,0.92)',
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          COLLECTION
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
            Your Ratings
          </Text>
          {ratedMovies.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  haptic();
                  setSortBy((s) => (s === 'recent' ? 'az' : 'recent'));
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: sortBy === 'az' ? '#2dd4bf' : 'rgba(255,255,255,0.12)',
                  backgroundColor:
                    sortBy === 'az' ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowUpDown
                  size={16}
                  color={sortBy === 'az' ? '#2dd4bf' : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  haptic();
                  setViewMode((v) => (v === 'list' ? 'grid' : 'list'));
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: viewMode === 'grid' ? '#2dd4bf' : 'rgba(255,255,255,0.12)',
                  backgroundColor:
                    viewMode === 'grid' ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {viewMode === 'list' ? (
                  <LayoutGrid size={16} color="rgba(255,255,255,0.6)" />
                ) : (
                  <List size={16} color="#2dd4bf" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {ratedMovies.length === 0 ? (
        <MotiView
          from={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 200 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(45,212,191,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(45,212,191,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Heart size={34} color="#2dd4bf" />
          </View>
          <Text
            style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: '700',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            No ratings yet
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Head to Discover and start rating movies — your taste profile adapts instantly.
          </Text>
        </MotiView>
      ) : (
        <FlatList
          key={viewMode}
          data={filtered}
          keyExtractor={(item) => String(item.movie.id)}
          numColumns={viewMode === 'grid' ? 2 : 1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            viewMode === 'grid'
              ? { paddingHorizontal: 12, paddingTop: 12, paddingBottom: insets.bottom + 20 }
              : { paddingBottom: insets.bottom + 20 }
          }
          columnWrapperStyle={viewMode === 'grid' ? { gap: 10, marginBottom: 10 } : undefined}
          ListHeaderComponent={() => (
            <View style={{ paddingTop: 16, paddingHorizontal: 16, marginBottom: 4 }}>
              {/* Stats */}
              <MotiView
                from={{ opacity: 0, translateY: -12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80 }}
                style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(45,212,191,0.2)',
                    backgroundColor: 'rgba(45,212,191,0.07)',
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#2dd4bf', fontSize: 28, fontWeight: '800' }}>
                    {likeCount}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}
                  >
                    <ThumbsUp size={12} color="rgba(45,212,191,0.7)" />
                    <Text
                      style={{ color: 'rgba(45,212,191,0.7)', fontSize: 12, fontWeight: '600' }}
                    >
                      Liked
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <MotiView
                      from={{ width: '0%' }}
                      animate={{ width: `${likeRatio}%` as any }}
                      transition={{ type: 'timing', duration: 700, delay: 300 }}
                      style={{ height: '100%', backgroundColor: '#2dd4bf', borderRadius: 2 }}
                    />
                  </View>
                </View>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(248,113,113,0.2)',
                    backgroundColor: 'rgba(248,113,113,0.07)',
                    padding: 14,
                  }}
                >
                  <Text style={{ color: '#f87171', fontSize: 28, fontWeight: '800' }}>
                    {passCount}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}
                  >
                    <ThumbsDown size={12} color="rgba(248,113,113,0.7)" />
                    <Text
                      style={{ color: 'rgba(248,113,113,0.7)', fontSize: 12, fontWeight: '600' }}
                    >
                      Passed
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      marginTop: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <MotiView
                      from={{ width: '0%' }}
                      animate={{ width: `${100 - likeRatio}%` as any }}
                      transition={{ type: 'timing', duration: 700, delay: 400 }}
                      style={{ height: '100%', backgroundColor: '#f87171', borderRadius: 2 }}
                    />
                  </View>
                </View>
              </MotiView>

              {/* Filter tabs */}
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 180 }}
                style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}
              >
                {(['all', 'liked', 'passed'] as Filter[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => {
                      haptic();
                      setFilter(f);
                    }}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 8,
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor:
                        filter === f
                          ? f === 'liked'
                            ? '#2dd4bf'
                            : f === 'passed'
                              ? '#f87171'
                              : 'rgba(255,255,255,0.3)'
                          : 'rgba(255,255,255,0.1)',
                      backgroundColor:
                        filter === f
                          ? f === 'liked'
                            ? 'rgba(45,212,191,0.15)'
                            : f === 'passed'
                              ? 'rgba(248,113,113,0.15)'
                              : 'rgba(255,255,255,0.1)'
                          : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          filter === f
                            ? f === 'liked'
                              ? '#2dd4bf'
                              : f === 'passed'
                                ? '#f87171'
                                : '#fff'
                            : 'rgba(255,255,255,0.5)',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {f === 'all'
                        ? `All (${ratedMovies.length})`
                        : f === 'liked'
                          ? `Liked (${likeCount})`
                          : `Passed (${passCount})`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </MotiView>
            </View>
          )}
          renderItem={
            viewMode === 'grid'
              ? ({ item: { movie, rating }, index }) => (
                  <MotiView
                    from={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 16, delay: Math.min(index * 55, 300) }}
                    style={{ flex: 1 }}
                  >
                    <TransitionPressable
                      sharedBoundTag={`image-${movie.id}`}
                      onPress={() => goToMovie(movie)}
                      style={{ borderRadius: 16, overflow: 'hidden' }}
                    >
                      <View style={{ height: 210 }}>
                        {movie.posterPath ? (
                          <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${movie.posterPath}` }}
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
                            <Film size={28} color="rgba(255,255,255,0.15)" />
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.88)']}
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 120,
                          }}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor:
                              rating === 'up' ? 'rgba(45,212,191,0.92)' : 'rgba(248,113,113,0.92)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {rating === 'up' ? (
                            <ThumbsUp size={12} color="#fff" />
                          ) : (
                            <ThumbsDown size={12} color="#fff" />
                          )}
                        </View>
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: '700',
                              lineHeight: 16,
                            }}
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
                  </MotiView>
                )
              : ({ item: { movie, rating }, index }) => (
                  <MotiView
                    from={{ opacity: 0, translateX: -24 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', damping: 20, delay: Math.min(index * 50, 300) }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 16,
                      marginBottom: 10,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.07)',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: 3,
                        alignSelf: 'stretch',
                        backgroundColor: rating === 'up' ? '#2dd4bf' : '#f87171',
                      }}
                    />
                    <TransitionPressable
                      sharedBoundTag={`image-${movie.id}`}
                      onPress={() => goToMovie(movie)}
                    >
                      <View style={{ width: 76, height: 108 }}>
                        {movie.posterPath ? (
                          <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${movie.posterPath}` }}
                            style={{ width: 76, height: 108 }}
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
                            <Film size={24} color="rgba(255,255,255,0.18)" />
                          </View>
                        )}
                      </View>
                    </TransitionPressable>
                    <View style={{ flex: 1, padding: 12 }}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: '700',
                          marginBottom: 3,
                          lineHeight: 19,
                        }}
                        numberOfLines={2}
                      >
                        {movie.title}
                      </Text>
                      {movie.year && (
                        <Text
                          style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginBottom: 6 }}
                        >
                          {movie.year}
                        </Text>
                      )}
                      {movie.genres?.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                          {movie.genres.slice(0, 2).map((g: string) => (
                            <View
                              key={g}
                              style={{
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.07)',
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 100,
                              }}
                            >
                              <Text
                                style={{
                                  color: 'rgba(255,255,255,0.45)',
                                  fontSize: 10,
                                  fontWeight: '500',
                                }}
                              >
                                {g}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={{ gap: 7, paddingRight: 14 }}>
                      <TouchableOpacity
                        onPress={() => {
                          haptic();
                          rateMovie(movie, 'up');
                        }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: rating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.1)',
                          backgroundColor:
                            rating === 'up' ? 'rgba(45,212,191,0.16)' : 'rgba(255,255,255,0.04)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ThumbsUp
                          size={16}
                          color={rating === 'up' ? '#2dd4bf' : 'rgba(255,255,255,0.35)'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          haptic();
                          rateMovie(movie, 'down');
                        }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          borderWidth: 1,
                          borderColor: rating === 'down' ? '#f87171' : 'rgba(255,255,255,0.1)',
                          backgroundColor:
                            rating === 'down' ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.04)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ThumbsDown
                          size={16}
                          color={rating === 'down' ? '#f87171' : 'rgba(255,255,255,0.35)'}
                        />
                      </TouchableOpacity>
                    </View>
                  </MotiView>
                )
          }
        />
      )}
    </LinearGradient>
  );
}
