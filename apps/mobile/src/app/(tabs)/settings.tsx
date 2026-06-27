'use client';

import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sliders,
  Tv,
  BarChart3,
  Check,
  Trophy,
  Flame,
  Film,
} from 'lucide-react-native';
import { usePreferences } from '@/utils/usePreferences';
import { useWatchlist } from '@/utils/useWatchlist';
import { GENRES, SERVICES } from '@/utils/constants';

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        padding: 18,
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: 'rgba(45,212,191,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(45,212,191,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
      </View>
      <Text
        style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 18, paddingLeft: 40 }}
      >
        {subtitle}
      </Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { prefs, updateGenres, updateServices, reset } = usePreferences();
  const { count: watchlistCount } = useWatchlist();
  const insets = useSafeAreaInsets();

  const activeWeights = useMemo(
    () =>
      Object.entries(prefs.genreWeights)
        .filter(([, w]) => w !== 0)
        .sort((a, b) => b[1] - a[1]),
    [prefs.genreWeights]
  );
  const maxWeight = useMemo(
    () => Math.max(...activeWeights.map(([, w]) => Math.abs(w)), 1),
    [activeWeights]
  );

  const ratedCount = Object.keys(prefs.ratings ?? {}).length;
  const likedCount = Object.values(prefs.ratings ?? {}).filter(
    (r: any) => r.rating === 'up'
  ).length;
  const likeRatio = ratedCount > 0 ? Math.round((likedCount / ratedCount) * 100) : 0;
  const topGenre = useMemo(
    () => activeWeights.find(([, w]) => w > 0)?.[0] ?? null,
    [activeWeights]
  );

  const handleReset = () => {
    Alert.alert(
      'Start Over?',
      'This will clear all preferences and ratings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            reset();
            router.replace('/onboarding' as any);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#080f1e', '#0d2a2a', '#080f1e']} style={{ flex: 1 }}>
      <StatusBar style="light" />

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
          CUSTOMIZE
        </Text>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
          Preferences
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      >
        {/* App Stats */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 60 }}
        >
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.07)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              padding: 18,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  backgroundColor: 'rgba(250,204,21,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(250,204,21,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trophy size={15} color="#facc15" />
              </View>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Your stats</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(45,212,191,0.2)',
                  backgroundColor: 'rgba(45,212,191,0.07)',
                }}
              >
                <Text
                  style={{ color: '#2dd4bf', fontSize: 26, fontWeight: '800', marginBottom: 2 }}
                >
                  {ratedCount}
                </Text>
                <Text
                  style={{
                    color: 'rgba(45,212,191,0.65)',
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Rated
                </Text>
                <View
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    marginTop: 8,
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  <MotiView
                    from={{ width: '0%' }}
                    animate={{ width: ratedCount > 0 ? '100%' : ('0%' as any) }}
                    transition={{ type: 'timing', duration: 700, delay: 400 }}
                    style={{ height: '100%', backgroundColor: '#2dd4bf', borderRadius: 2 }}
                  />
                </View>
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(167,139,250,0.2)',
                  backgroundColor: 'rgba(167,139,250,0.07)',
                }}
              >
                <Text
                  style={{ color: '#a78bfa', fontSize: 26, fontWeight: '800', marginBottom: 2 }}
                >
                  {watchlistCount}
                </Text>
                <Text
                  style={{
                    color: 'rgba(167,139,250,0.65)',
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Saved
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(250,204,21,0.2)',
                  backgroundColor: 'rgba(250,204,21,0.07)',
                }}
              >
                <Text
                  style={{ color: '#facc15', fontSize: 26, fontWeight: '800', marginBottom: 2 }}
                >
                  {likeRatio}%
                </Text>
                <Text
                  style={{
                    color: 'rgba(250,204,21,0.65)',
                    fontSize: 11,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Like rate
                </Text>
              </View>
            </View>

            {topGenre && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 500 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: 'rgba(45,212,191,0.07)',
                  borderWidth: 1,
                  borderColor: 'rgba(45,212,191,0.15)',
                }}
              >
                <Flame size={16} color="#2dd4bf" />
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                  You love <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>{topGenre}</Text>{' '}
                  the most
                </Text>
              </MotiView>
            )}
          </View>
        </MotiView>

        {/* Genres */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 120 }}
        >
          <SectionCard
            icon={<Sliders size={15} color="#2dd4bf" />}
            title="Favorite genres"
            subtitle="Tap to add or remove — updates recommendations instantly."
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GENRES.map((genre) => {
                const active = prefs.genres.includes(genre);
                const next = active
                  ? prefs.genres.filter((g) => g !== genre)
                  : [...prefs.genres, genre];
                return (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => {
                      haptic();
                      updateGenres(next);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      borderWidth: 1,
                      borderColor: active ? '#2dd4bf' : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? 'rgba(45,212,191,0.14)' : 'rgba(255,255,255,0.04)',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 100,
                    }}
                  >
                    <AnimatePresence>
                      {active && (
                        <MotiView
                          from={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', damping: 14 }}
                        >
                          <Check size={12} color="#2dd4bf" />
                        </MotiView>
                      )}
                    </AnimatePresence>
                    <Text
                      style={{
                        color: active ? '#2dd4bf' : 'rgba(255,255,255,0.65)',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>
        </MotiView>

        {/* Services */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 180 }}
        >
          <SectionCard
            icon={<Tv size={15} color="#2dd4bf" />}
            title="Streaming services"
            subtitle="We boost titles available on your selected services."
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SERVICES.map((service) => {
                const active = prefs.services.includes(service.id);
                const next = active
                  ? prefs.services.filter((s) => s !== service.id)
                  : [...prefs.services, service.id];
                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => {
                      haptic();
                      updateServices(next);
                    }}
                    style={{
                      alignItems: 'center',
                      gap: 8,
                      borderWidth: 1,
                      borderColor: active ? '#2dd4bf' : 'rgba(255,255,255,0.1)',
                      backgroundColor: active ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)',
                      padding: 14,
                      borderRadius: 18,
                      width: '30%',
                      position: 'relative',
                    }}
                  >
                    <MotiView
                      animate={{
                        backgroundColor: active ? '#14b8a6' : 'rgba(255,255,255,0.08)',
                        scale: active ? 1.06 : 1,
                      }}
                      transition={{ type: 'spring' }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                        {service.short}
                      </Text>
                    </MotiView>
                    <Text
                      style={{
                        color: active ? '#2dd4bf' : 'rgba(255,255,255,0.55)',
                        fontSize: 11,
                        fontWeight: '600',
                        textAlign: 'center',
                      }}
                    >
                      {service.name}
                    </Text>
                    <AnimatePresence>
                      {active && (
                        <MotiView
                          from={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring' }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#14b8a6',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={10} color="#fff" />
                        </MotiView>
                      )}
                    </AnimatePresence>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>
        </MotiView>

        {/* Taste snapshot */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 240 }}
        >
          <SectionCard
            icon={<BarChart3 size={15} color="#2dd4bf" />}
            title="Taste snapshot"
            subtitle="Genre weights learned from your ratings."
          >
            {activeWeights.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Film size={36} color="rgba(255,255,255,0.15)" />
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 10,
                  }}
                >
                  Rate a few movies to build your taste profile.
                </Text>
              </View>
            ) : (
              activeWeights.map(([genre, weight], i) => {
                const pct = Math.min(100, (Math.abs(weight) / maxWeight) * 100);
                const isPos = weight > 0;
                return (
                  <MotiView
                    key={genre}
                    from={{ opacity: 0, translateX: -16 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', delay: i * 40 }}
                    style={{ marginBottom: 12 }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 5,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isPos ? (
                          <ThumbsUp size={11} color="#2dd4bf" />
                        ) : (
                          <ThumbsDown size={11} color="#f87171" />
                        )}
                        <Text
                          style={{
                            color: 'rgba(255,255,255,0.75)',
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {genre}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: isPos ? '#2dd4bf' : '#f87171',
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {isPos ? '+' : ''}
                        {weight}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <MotiView
                        from={{ width: '0%' }}
                        animate={{ width: `${pct}%` as any }}
                        transition={{ type: 'timing', duration: 600, delay: 300 + i * 60 }}
                        style={{
                          height: '100%',
                          backgroundColor: isPos ? '#14b8a6' : '#f87171',
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </MotiView>
                );
              })
            )}
          </SectionCard>
        </MotiView>

        {/* Reset */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 300 }}
        >
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: 'rgba(248,113,113,0.18)',
              backgroundColor: 'rgba(248,113,113,0.05)',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 3 }}>
                Start over
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Clear all preferences and ratings.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleReset}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderWidth: 1,
                borderColor: 'rgba(248,113,113,0.3)',
                backgroundColor: 'rgba(248,113,113,0.1)',
                paddingHorizontal: 16,
                paddingVertical: 11,
                borderRadius: 100,
              }}
            >
              <RotateCcw size={14} color="#f87171" />
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '700' }}>Reset</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </ScrollView>
    </LinearGradient>
  );
}
