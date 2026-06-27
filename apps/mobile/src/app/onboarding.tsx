'use client';

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { Sparkles, ChevronRight, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GENRES, SERVICES } from '@/utils/constants';
import { usePreferences } from '@/utils/usePreferences';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'splash' | 'genres' | 'services';

function triggerHaptic(type: 'selection' | 'impact' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'selection') Haptics.selectionAsync();
  else if (type === 'impact') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = usePreferences();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('splash');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Floating orb animations
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = (anim: Animated.Value, duration: number, dist: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: dist, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();
    float(orb1Y, 3400, -20);
    float(orb2Y, 4200, 24);
    float(orb3Y, 2900, -15);
  }, [orb1Y, orb2Y, orb3Y]);

  const toggleGenre = (genre: string) => {
    triggerHaptic('selection');
    setSelectedGenres((p) => (p.includes(genre) ? p.filter((g) => g !== genre) : [...p, genre]));
  };

  const toggleService = (id: string) => {
    triggerHaptic('selection');
    setSelectedServices((p) => (p.includes(id) ? p.filter((s) => s !== id) : [...p, id]));
  };

  const handleFinish = () => {
    triggerHaptic('success');
    completeOnboarding(selectedGenres, selectedServices);
    router.replace('/' as any);
  };

  const stepIndex = step === 'splash' ? 0 : step === 'genres' ? 1 : 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#080f1e' }}>
      <StatusBar style="light" />

      {/* Animated orbs */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 40,
          left: -70,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(20,184,166,0.14)',
          transform: [{ translateY: orb1Y }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 100,
          right: -90,
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: 'rgba(99,102,241,0.09)',
          transform: [{ translateY: orb2Y }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '45%',
          left: '25%',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(45,212,191,0.07)',
          transform: [{ translateY: orb3Y }],
        }}
      />

      {/* Progress indicator */}
      {step !== 'splash' && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: insets.top + 16,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          {[1, 2].map((i) => (
            <MotiView
              key={i}
              animate={{
                width: stepIndex >= i ? 28 : 8,
                backgroundColor: stepIndex >= i ? '#14b8a6' : 'rgba(255,255,255,0.2)',
              }}
              transition={{ type: 'timing', duration: 320 }}
              style={{ height: 8, borderRadius: 4 }}
            />
          ))}
        </MotiView>
      )}

      <AnimatePresence exitBeforeEnter>
        {/* ── SPLASH ── */}
        {step === 'splash' && (
          <MotiView
            key="splash"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 350 }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              paddingTop: insets.top,
            }}
          >
            {/* Icon */}
            <MotiView
              from={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, delay: 80 }}
              style={{
                width: 88,
                height: 88,
                borderRadius: 26,
                backgroundColor: '#14b8a6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 36,
                shadowColor: '#14b8a6',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.55,
                shadowRadius: 36,
              }}
            >
              <Text style={{ fontSize: 40 }}>🎬</Text>
            </MotiView>

            {/* Badge */}
            <MotiView
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 180 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: 'rgba(45,212,191,0.35)',
                backgroundColor: 'rgba(45,212,191,0.1)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 100,
                marginBottom: 28,
              }}
            >
              <Sparkles size={13} color="#2dd4bf" />
              <Text
                style={{ color: '#2dd4bf', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}
              >
                AI-POWERED RECOMMENDATIONS
              </Text>
            </MotiView>

            {/* Heading */}
            <MotiText
              from={{ opacity: 0, translateY: 24 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', delay: 270 }}
              style={{
                fontSize: 50,
                fontWeight: '800',
                textAlign: 'center',
                lineHeight: 58,
                marginBottom: 20,
                letterSpacing: -1.2,
              }}
            >
              <Text style={{ color: '#fff' }}>Your Next{'\n'}</Text>
              <Text style={{ color: '#2dd4bf' }}>Favorite Film</Text>
            </MotiText>

            {/* Stats */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', delay: 420 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}
            >
              {['10K+ Movies', '12 Genres', 'Free Forever'].map((s, i) => (
                <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  {i > 0 && (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.25)',
                      }}
                    />
                  )}
                  <Text
                    style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500' }}
                  >
                    {s}
                  </Text>
                </View>
              ))}
            </MotiView>

            {/* Description */}
            <MotiText
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', delay: 520 }}
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: 52,
                maxWidth: 300,
              }}
            >
              Tell us what you love and we'll build a taste profile that gets smarter with every
              rating.
            </MotiText>

            {/* CTA */}
            <MotiView
              from={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 600 }}
            >
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('impact');
                  setStep('genres');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#14b8a6',
                  paddingHorizontal: 52,
                  paddingVertical: 20,
                  borderRadius: 100,
                  shadowColor: '#14b8a6',
                  shadowOffset: { width: 0, height: 14 },
                  shadowOpacity: 0.5,
                  shadowRadius: 28,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>Get Started</Text>
                <ChevronRight size={22} color="#fff" />
              </TouchableOpacity>
            </MotiView>
          </MotiView>
        )}

        {/* ── GENRES ── */}
        {step === 'genres' && (
          <MotiView
            key="genres"
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -50 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: insets.top + 60,
                paddingHorizontal: 24,
                paddingBottom: insets.bottom + 32,
                alignItems: 'center',
              }}
              showsVerticalScrollIndicator={false}
            >
              <MotiView
                from={{ opacity: 0, translateY: -16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80 }}
                style={{ marginBottom: 32, alignItems: 'center' }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: '#fff',
                    textAlign: 'center',
                    letterSpacing: -0.6,
                    lineHeight: 40,
                    marginBottom: 10,
                  }}
                >
                  What genres{'\n'}do you love?
                </Text>
                <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  Pick at least one to continue
                </Text>
              </MotiView>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 10,
                  marginBottom: 32,
                }}
              >
                {GENRES.map((genre, i) => {
                  const active = selectedGenres.includes(genre);
                  return (
                    <MotiView
                      key={genre}
                      from={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 60 + i * 28 }}
                    >
                      <TouchableOpacity
                        onPress={() => toggleGenre(genre)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderWidth: 1.5,
                          borderColor: active ? '#2dd4bf' : 'rgba(255,255,255,0.12)',
                          backgroundColor: active
                            ? 'rgba(45,212,191,0.16)'
                            : 'rgba(255,255,255,0.04)',
                          paddingHorizontal: 18,
                          paddingVertical: 12,
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
                              <Check size={13} color="#2dd4bf" />
                            </MotiView>
                          )}
                        </AnimatePresence>
                        <Text
                          style={{
                            color: active ? '#2dd4bf' : 'rgba(255,255,255,0.72)',
                            fontSize: 14,
                            fontWeight: '600',
                          }}
                        >
                          {genre}
                        </Text>
                      </TouchableOpacity>
                    </MotiView>
                  );
                })}
              </View>

              <AnimatePresence>
                {selectedGenres.length > 0 && (
                  <MotiView
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      borderRadius: 100,
                      borderWidth: 1,
                      borderColor: 'rgba(45,212,191,0.3)',
                      backgroundColor: 'rgba(45,212,191,0.08)',
                      paddingHorizontal: 18,
                      paddingVertical: 8,
                      marginBottom: 24,
                    }}
                  >
                    <Text style={{ color: '#2dd4bf', fontSize: 13, fontWeight: '600' }}>
                      {selectedGenres.length} genre{selectedGenres.length !== 1 ? 's' : ''} selected
                      ✓
                    </Text>
                  </MotiView>
                )}
              </AnimatePresence>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('impact');
                  setStep('services');
                }}
                disabled={selectedGenres.length === 0}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: selectedGenres.length > 0 ? '#14b8a6' : 'rgba(255,255,255,0.08)',
                  paddingHorizontal: 48,
                  paddingVertical: 18,
                  borderRadius: 100,
                  opacity: selectedGenres.length > 0 ? 1 : 0.5,
                  shadowColor: '#14b8a6',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: selectedGenres.length > 0 ? 0.4 : 0,
                  shadowRadius: 22,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Continue</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          </MotiView>
        )}

        {/* ── SERVICES ── */}
        {step === 'services' && (
          <MotiView
            key="services"
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -50 }}
            transition={{ type: 'spring', damping: 22 }}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                paddingTop: insets.top + 60,
                paddingHorizontal: 24,
                paddingBottom: insets.bottom + 32,
                alignItems: 'center',
              }}
              showsVerticalScrollIndicator={false}
            >
              <MotiView
                from={{ opacity: 0, translateY: -16 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: 80 }}
                style={{ marginBottom: 32, alignItems: 'center' }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: '#fff',
                    textAlign: 'center',
                    letterSpacing: -0.6,
                    lineHeight: 40,
                    marginBottom: 10,
                  }}
                >
                  Your streaming{'\n'}services
                </Text>
                <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  We'll prioritize what you can watch now
                </Text>
              </MotiView>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 12,
                  marginBottom: 32,
                  width: '100%',
                }}
              >
                {SERVICES.map((service, i) => {
                  const active = selectedServices.includes(service.id);
                  return (
                    <MotiView
                      key={service.id}
                      from={{ opacity: 0, scale: 0.8, translateY: 16 }}
                      animate={{ opacity: 1, scale: 1, translateY: 0 }}
                      transition={{ type: 'spring', delay: 60 + i * 45 }}
                    >
                      <TouchableOpacity
                        onPress={() => toggleService(service.id)}
                        style={{
                          width: (SCREEN_WIDTH - 72) / 3,
                          alignItems: 'center',
                          gap: 10,
                          borderWidth: 1.5,
                          borderColor: active ? '#2dd4bf' : 'rgba(255,255,255,0.1)',
                          backgroundColor: active
                            ? 'rgba(45,212,191,0.14)'
                            : 'rgba(255,255,255,0.04)',
                          paddingVertical: 22,
                          borderRadius: 22,
                        }}
                      >
                        <MotiView
                          animate={{
                            backgroundColor: active ? '#14b8a6' : 'rgba(255,255,255,0.1)',
                            scale: active ? 1.08 : 1,
                          }}
                          transition={{ type: 'spring' }}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                            {service.short}
                          </Text>
                        </MotiView>
                        <Text
                          style={{
                            color: active ? '#2dd4bf' : 'rgba(255,255,255,0.6)',
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
                                top: 8,
                                right: 8,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: '#14b8a6',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={11} color="#fff" />
                            </MotiView>
                          )}
                        </AnimatePresence>
                      </TouchableOpacity>
                    </MotiView>
                  );
                })}
              </View>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 13,
                  marginBottom: 32,
                  textAlign: 'center',
                }}
              >
                You can change this anytime in Settings
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setStep('genres')}
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    paddingHorizontal: 28,
                    paddingVertical: 18,
                    borderRadius: 100,
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' }}>
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleFinish}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    backgroundColor: '#14b8a6',
                    paddingVertical: 18,
                    borderRadius: 100,
                    shadowColor: '#14b8a6',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.48,
                    shadowRadius: 24,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                    Start Exploring
                  </Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
