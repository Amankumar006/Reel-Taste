'use client';

import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Bookmark, Film, Trash2, LayoutGrid, List, Star } from 'lucide-react-native';
import { useWatchlist } from '@/utils/useWatchlist';
import { TMDB_IMAGE_BASE } from '@/utils/constants';

const TransitionPressable = ({ sharedBoundTag, ...props }: any) => <TouchableOpacity {...props} />;


type ViewMode = 'list' | 'grid';

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

export default function WatchlistScreen() {
  const router = useRouter();
  const { movies, toggle } = useWatchlist();
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleRemove = (movie: any) => {
    haptic();
    Alert.alert('Remove from Watchlist?', movie.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => toggle(movie) },
    ]);
  };

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
          SAVED
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
            Watchlist
          </Text>
          <TouchableOpacity
            onPress={() => {
              haptic();
              setViewMode((v) => (v === 'list' ? 'grid' : 'list'));
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {viewMode === 'list' ? (
              <LayoutGrid size={18} color="rgba(255,255,255,0.7)" />
            ) : (
              <List size={18} color="rgba(255,255,255,0.7)" />
            )}
          </TouchableOpacity>
        </View>
        {movies.length > 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 }}>
            {movies.length} film{movies.length !== 1 ? 's' : ''} saved
          </Text>
        )}
      </View>

      <AnimatePresence exitBeforeEnter>
        {movies.length === 0 ? (
          <MotiView
            key="empty"
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', delay: 150 }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 36,
            }}
          >
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: 'rgba(45,212,191,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(45,212,191,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Bookmark size={36} color="#2dd4bf" />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: '800',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              Nothing saved yet
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Tap the bookmark icon on any movie to save it for later.
            </Text>
          </MotiView>
        ) : viewMode === 'list' ? (
          <MotiView
            key="list"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1 }}
          >
            <FlatList
              data={movies}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
              renderItem={({ item: movie, index }) => (
                <MotiView
                  from={{ opacity: 0, translateX: -20 }}
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
                  <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: '#2dd4bf' }} />
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
                    {movie.voteAverage > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Star size={11} color="#facc15" fill="#facc15" />
                        <Text style={{ color: '#facc15', fontSize: 12, fontWeight: '700' }}>
                          {movie.voteAverage?.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {movie.genres?.length > 0 && (
                      <View
                        style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}
                      >
                        {movie.genres.slice(0, 2).map((g: string) => (
                          <View
                            key={g}
                            style={{
                              borderWidth: 1,
                              borderColor: 'rgba(255,255,255,0.07)',
                              backgroundColor: 'rgba(255,255,255,0.04)',
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 100,
                            }}
                          >
                            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
                              {g}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemove(movie)}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: 'rgba(248,113,113,0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(248,113,113,0.2)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={15} color="#f87171" />
                    </View>
                  </TouchableOpacity>
                </MotiView>
              )}
            />
          </MotiView>
        ) : (
          <MotiView
            key="grid"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ flex: 1 }}
          >
            <FlatList
              data={movies}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingTop: 12,
                paddingBottom: insets.bottom + 24,
              }}
              columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
              renderItem={({ item: movie, index }) => (
                <MotiView
                  from={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 16, delay: Math.min(index * 60, 350) }}
                  style={{ flex: 1 }}
                >
                  <TransitionPressable
                    sharedBoundTag={`image-${movie.id}`}
                    onPress={() => goToMovie(movie)}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <View style={{ height: 220 }}>
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
                          <Film size={32} color="rgba(255,255,255,0.15)" />
                        </View>
                      )}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.88)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }}
                      />
                      <TouchableOpacity
                        onPress={() => handleRemove(movie)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.15)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Bookmark size={13} color="#2dd4bf" fill="#2dd4bf" />
                      </TouchableOpacity>
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
                </MotiView>
              )}
            />
          </MotiView>
        )}
      </AnimatePresence>
    </LinearGradient>
  );
}
