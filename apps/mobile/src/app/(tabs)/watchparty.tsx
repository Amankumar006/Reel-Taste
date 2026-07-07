'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Check,
  Copy,
  Film,
  Flame,
  Gamepad2,
  Heart,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  Tv,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { TMDB_IMAGE_BASE, TMDB_BACKDROP_BASE } from '@/utils/constants';

// ── Constants ──────────────────────────────────────────────────────────────
const BASE = process.env.EXPO_PUBLIC_BASE_URL ?? '';
const { width: SW, height: SH } = Dimensions.get('window');

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

const CURATED_ANIME_IDS = [262, 410, 7663, 120, 5251, 11608, 1, 4];
const CURATED_GAME_IDS = [64591, 313424, 622788, 1273796, 70805, 191843, 267893, 206420];

const USER_ID_KEY = 'rt_party_user_id';
const ROOM_CODE_KEY = 'rt_party_room_code';

// ── Helpers ────────────────────────────────────────────────────────────────
function haptic(type: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function posterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function backdropUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${TMDB_BACKDROP_BASE}${path}`;
}

// ── SwipeCard Component ────────────────────────────────────────────────────
interface SwipeCardProps {
  card: any;
  mediaType: string;
  onSwipe: (rating: 'up' | 'down') => void;
  playTrailers: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleTrailers: () => void;
}

function SwipeCard({
  card,
  mediaType,
  onSwipe,
  playTrailers,
  muted,
  onToggleMute,
  onToggleTrailers,
}: SwipeCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, { dx, vx }) => {
        const THRESHOLD = SW * 0.3;
        if (Math.abs(dx) > THRESHOLD || Math.abs(vx) > 0.8) {
          const dir = dx > 0 ? 1 : -1;
          haptic('medium');
          Animated.timing(pan, {
            toValue: { x: dir * SW * 1.5, y: 0 },
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            onSwipe(dir > 0 ? 'up' : 'down');
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Derive like / pass opacity from drag position
  const likeOpacityInterp = pan.x.interpolate({
    inputRange: [0, SW * 0.3],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacityInterp = pan.x.interpolate({
    inputRange: [-SW * 0.3, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const rotate = pan.x.interpolate({
    inputRange: [-SW / 2, SW / 2],
    outputRange: ['-8deg', '8deg'],
    extrapolate: 'clamp',
  });

  const bg = backdropUrl(card.backdropPath) || posterUrl(card.posterPath);
  const poster = posterUrl(card.posterPath);

  return (
    <View style={styles.cardWrapper}>
      <Animated.View
        style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {/* Background image */}
        {bg ? (
          <Image source={{ uri: bg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1628' }]} />
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
          locations={[0.3, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Like / Pass overlays */}
        <Animated.View style={[styles.voteOverlay, styles.likeOverlay, { opacity: likeOpacityInterp }]}>
          <Text style={styles.likeText}>LIKE ❤️</Text>
        </Animated.View>
        <Animated.View style={[styles.voteOverlay, styles.passOverlay, { opacity: passOpacityInterp }]}>
          <Text style={styles.passText}>PASS ✕</Text>
        </Animated.View>

        {/* Top-right controls */}
        <View style={styles.topControls}>
          {playTrailers && (
            <TouchableOpacity onPress={onToggleMute} style={styles.muteBtn} activeOpacity={0.8}>
              {muted ? (
                <VolumeX size={16} color="#fff" />
              ) : (
                <Volume2 size={16} color="#fff" />
              )}
            </TouchableOpacity>
          )}
          {card.score != null && (
            <View style={styles.scoreBadge}>
              <Star size={12} color="#2dd4bf" fill="#2dd4bf" />
              <Text style={styles.scoreText}>{card.score}</Text>
            </View>
          )}
        </View>

        {/* Trailer toggle chip */}
        <TouchableOpacity onPress={onToggleTrailers} style={styles.trailerToggle} activeOpacity={0.8}>
          <Text style={styles.trailerToggleLabel}>Trailers</Text>
          <View style={[styles.toggleTrack, playTrailers && styles.toggleTrackOn]}>
            <View style={[styles.toggleThumb, playTrailers && styles.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {/* Card content */}
        <View style={styles.cardContent}>
          <View style={styles.cardMeta}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.cardPoster} contentFit="cover" />
            ) : null}
            <View style={{ flex: 1 }}>
              {card.year ? <Text style={styles.yearText}>{card.year}</Text> : null}
              <Text style={styles.titleText} numberOfLines={2}>{card.title}</Text>
            </View>
          </View>
          {card.synopsis || card.overview ? (
            <Text style={styles.synopsisText} numberOfLines={3}>
              {card.synopsis || card.overview}
            </Text>
          ) : null}
          {card.genres?.length > 0 && (
            <View style={styles.genrePills}>
              {card.genres.slice(0, 3).map((g: string) => (
                <View key={g} style={styles.genrePill}>
                  <Text style={styles.genrePillText}>{g}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Action buttons below card */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => { haptic('medium'); onSwipe('down'); }}
          style={[styles.actionBtn, styles.passBtn]}
          activeOpacity={0.8}
        >
          <X size={30} color="#f87171" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic('success'); onSwipe('up'); }}
          style={[styles.actionBtn, styles.likeBtn]}
          activeOpacity={0.8}
        >
          <Heart size={30} color="#2dd4bf" fill="rgba(45,212,191,0.15)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main WatchParty Screen ─────────────────────────────────────────────────
export default function WatchPartyScreen() {
  const insets = useSafeAreaInsets();

  // User & room state
  const [userId, setUserId] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create room settings
  const [mediaType, setMediaType] = useState<'movies' | 'anime' | 'games'>('movies');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Swiper state
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipingLoading, setSwipingLoading] = useState(false);
  const [playTrailers, setPlayTrailers] = useState(false); // off by default on mobile
  const [muted, setMuted] = useState(true);

  // Match state
  const [matches, setMatches] = useState<any[]>([]);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [lastMatch, setLastMatch] = useState<any>(null);

  // UI state
  const [showPartyInfo, setShowPartyInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const matchesRef = useRef<any[]>([]);
  const loadedRoomParamsRef = useRef('');

  // ── Init: load userId + restore room ──────────────────────────────────
  useEffect(() => {
    (async () => {
      let id = await AsyncStorage.getItem(USER_ID_KEY);
      if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 9);
        await AsyncStorage.setItem(USER_ID_KEY, id);
      }
      setUserId(id);

      const saved = await AsyncStorage.getItem(ROOM_CODE_KEY);
      if (saved) setRoomCode(saved);
    })();
  }, []);

  // ── Keep matchesRef in sync ────────────────────────────────────────────
  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // ── Poll room status every 1.5 s ──────────────────────────────────────
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      setMatches([]);
      return;
    }

    let active = true;

    async function checkStatus() {
      try {
        const res = await fetch(`${BASE}/api/rooms/status?code=${roomCode}`);
        if (!res.ok) {
          if (res.status === 404) handleLeave();
          return;
        }
        const data = await res.json();
        if (!active) return;
        setRoom(data);

        const current = matchesRef.current;
        if (data.matches && data.matches.length > current.length) {
          const fresh = data.matches.filter(
            (m: any) => !current.some((e) => e.mediaId === m.mediaId)
          );
          if (fresh.length > 0) {
            setLastMatch(fresh[0]);
            setShowMatchModal(true);
            haptic('success');
          }
        }
        setMatches(data.matches || []);
      } catch {
        // silent
      }
    }

    void checkStatus();
    const interval = setInterval(checkStatus, 1500);
    return () => { active = false; clearInterval(interval); };
  }, [roomCode]);

  // ── Load card queue when room params change ────────────────────────────
  useEffect(() => {
    if (!room || !roomCode) {
      setQueue([]);
      setCurrentIndex(0);
      loadedRoomParamsRef.current = '';
      return;
    }

    const key = `${roomCode}_${room.mediaType}_${(room.genres || []).join(',')}`;
    if (loadedRoomParamsRef.current === key) return;

    let active = true;
    async function loadQueue() {
      setSwipingLoading(true);
      try {
        let items: any[] = [];
        if (room.mediaType === 'movies') {
          const params = new URLSearchParams();
          if (room.genres?.length) params.set('genres', room.genres.join(','));
          const res = await fetch(`${BASE}/api/movies?${params}`);
          if (res.ok) { const d = await res.json(); items = d.movies || []; }
        } else if (room.mediaType === 'anime') {
          items = (await Promise.all(
            CURATED_ANIME_IDS.map(async (id) => {
              const res = await fetch(`${BASE}/api/anime/${id}`);
              if (!res.ok) return null;
              const d = await res.json();
              return { ...d, synopsis: d.synopsis || d.overview, year: d.releaseDate?.split('-')[0], score: Math.round(d.score / 10), isAnime: true };
            })
          )).filter(Boolean);
        } else if (room.mediaType === 'games') {
          items = (await Promise.all(
            CURATED_GAME_IDS.map(async (id) => {
              const res = await fetch(`${BASE}/api/games/${id}`);
              if (!res.ok) return null;
              const d = await res.json();
              return { ...d, synopsis: d.overview, year: d.releaseDate?.split('-')[0], score: Math.round(d.voteAverage * 10), isGame: true };
            })
          )).filter(Boolean);
        }
        if (active) {
          setQueue(items);
          setCurrentIndex(0);
          loadedRoomParamsRef.current = key;
        }
      } catch {
        // silent
      } finally {
        if (active) setSwipingLoading(false);
      }
    }
    void loadQueue();
    return () => { active = false; };
  }, [room, roomCode]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async () => {
    if (!userId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mediaType, genres: selectedGenres }),
      });
      if (!res.ok) throw new Error('Failed to create watch party');
      const data = await res.json();
      await AsyncStorage.setItem(ROOM_CODE_KEY, data.code);
      setRoomCode(data.code);
      setRoom(data);
      haptic('success');
    } catch (e: any) {
      setError(e.message || 'Error creating room');
    } finally {
      setActionLoading(false);
    }
  }, [userId, mediaType, selectedGenres]);

  const handleJoinRoom = useCallback(async () => {
    if (!userId || !inputCode) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: inputCode }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to join');
      }
      const data = await res.json();
      await AsyncStorage.setItem(ROOM_CODE_KEY, data.code);
      setRoomCode(data.code);
      setRoom(data);
      setInputCode('');
      haptic('success');
    } catch (e: any) {
      setError(e.message || 'Error joining room');
    } finally {
      setActionLoading(false);
    }
  }, [userId, inputCode]);

  const handleLeave = useCallback(async () => {
    await AsyncStorage.removeItem(ROOM_CODE_KEY);
    setRoomCode('');
    setRoom(null);
    setInputCode('');
    setMatches([]);
    setQueue([]);
    loadedRoomParamsRef.current = '';
    haptic('light');
  }, []);

  const handleResetSession = useCallback(() => {
    Alert.alert(
      'Reset Lobby',
      'Are you sure? This will clear all swipes and matches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BASE}/api/rooms/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: roomCode }),
              });
              setMatches([]);
              setCurrentIndex(0);
              loadedRoomParamsRef.current = '';
              haptic('medium');
            } catch { /* silent */ }
          },
        },
      ]
    );
  }, [roomCode]);

  const handleSwipe = useCallback(async (rating: 'up' | 'down') => {
    const item = queue[currentIndex];
    if (!item || !roomCode || !userId) return;
    setCurrentIndex((p) => p + 1);
    try {
      const res = await fetch(`${BASE}/api/rooms/swipe`, {
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
        const d = await res.json();
        if (d.match) {
          setLastMatch(d.movie);
          setShowMatchModal(true);
          haptic('success');
        }
      }
    } catch { /* silent */ }
  }, [queue, currentIndex, roomCode, userId]);

  const copyCode = useCallback(async () => {
    await Clipboard.setStringAsync(roomCode);
    setCopied(true);
    haptic('light');
    setTimeout(() => setCopied(false), 2000);
  }, [roomCode]);

  // ── Derived ───────────────────────────────────────────────────────────
  const activeCard = queue[currentIndex];

  // ── Match Modal ───────────────────────────────────────────────────────
  const renderMatchModal = () => (
    <Modal visible={showMatchModal && !!lastMatch} transparent animationType="fade">
      <View style={styles.matchOverlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          style={styles.matchCard}
        >
          <View style={styles.matchIconWrap}>
            <Flame size={36} color="#2dd4bf" fill="rgba(45,212,191,0.2)" />
          </View>
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSub}>You and your friend both liked this!</Text>

          {lastMatch?.posterPath && (
            <Image
              source={{ uri: posterUrl(lastMatch.posterPath) ?? '' }}
              style={styles.matchPoster}
              contentFit="cover"
            />
          )}
          <Text style={styles.matchMovieTitle}>{lastMatch?.title}</Text>

          <TouchableOpacity
            onPress={() => setShowMatchModal(false)}
            style={styles.keepSwipingBtn}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#14b8a6', '#10b981']} style={styles.keepSwipingGrad}>
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );

  // ── Party Info Modal ──────────────────────────────────────────────────
  const renderPartyInfo = () => (
    <Modal visible={showPartyInfo} transparent animationType="slide">
      <Pressable style={styles.infoOverlay} onPress={() => setShowPartyInfo(false)}>
        <Pressable style={styles.infoSheet} onPress={() => {}}>
          <View style={styles.infoHandle} />
          <Text style={styles.infoTitle}>Watch Party Details</Text>

          {/* Room code */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>ROOM CODE</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{roomCode}</Text>
              <TouchableOpacity onPress={copyCode} style={styles.copyBtn} activeOpacity={0.8}>
                {copied ? <Check size={16} color="#2dd4bf" /> : <Copy size={16} color="rgba(255,255,255,0.6)" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Members */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>ROOM MEMBERS</Text>
            <View style={styles.memberRow}>
              <View style={styles.dotGreen} />
              <Text style={styles.memberText}>
                Host ({room?.hostId === userId ? 'You' : 'Friend'})
              </Text>
            </View>
            <View style={styles.memberRow}>
              {room?.memberId ? (
                <>
                  <View style={styles.dotGreen} />
                  <Text style={styles.memberText}>
                    Guest ({room?.memberId === userId ? 'You' : 'Friend'})
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.dotAmber} />
                  <Text style={[styles.memberText, { color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }]}>
                    Waiting for guest…
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Category */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>CATEGORY</Text>
            <Text style={styles.categoryText}>{room?.mediaType}</Text>
            {room?.genres?.length > 0 && (
              <View style={styles.genrePills}>
                {room.genres.map((gid: string) => {
                  const g = MOVIE_GENRES.find((x) => x.id === gid);
                  return (
                    <View key={gid} style={styles.genrePill}>
                      <Text style={styles.genrePillText}>{g?.name || gid}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Matches */}
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>MATCHES ({matches.length})</Text>
            {matches.length === 0 ? (
              <Text style={styles.emptyText}>No matches yet — keep swiping!</Text>
            ) : (
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                {matches.map((m: any) => (
                  <View key={m.mediaId} style={styles.matchItem}>
                    {m.posterPath && (
                      <Image
                        source={{ uri: posterUrl(m.posterPath) ?? '' }}
                        style={styles.matchItemPoster}
                        contentFit="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.matchItemTitle} numberOfLines={1}>{m.title}</Text>
                      <View style={styles.matchItemBadge}>
                        <Flame size={10} color="#2dd4bf" fill="rgba(45,212,191,0.3)" />
                        <Text style={styles.matchItemBadgeText}>Matched!</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Actions */}
          <View style={styles.infoActions}>
            <TouchableOpacity onPress={() => { setShowPartyInfo(false); handleResetSession(); }} style={styles.resetBtn} activeOpacity={0.8}>
              <RefreshCw size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.resetBtnText}>Reset Lobby</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowPartyInfo(false); handleLeave(); }}
              style={styles.leaveBtn}
              activeOpacity={0.8}
            >
              <LogOut size={14} color="#f87171" />
              <Text style={styles.leaveBtnText}>Leave Room</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: insets.bottom + 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Lobby Entry Screen ─────────────────────────────────────────────────
  const renderEntry = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.entryScroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <Sparkles size={24} color="#2dd4bf" />
          <Text style={styles.screenTitle}>Watch Party</Text>
        </View>
        <Text style={styles.screenSub}>
          Create a private room, swipe together with a friend, and match instantly.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Create Card ── */}
        <View style={styles.card2}>
          <View style={styles.card2Header}>
            <Plus size={18} color="#2dd4bf" />
            <Text style={styles.card2Title}>Host a Party</Text>
          </View>
          <Text style={styles.card2Sub}>
            Generate a room code and pick what you'll be swiping on.
          </Text>

          {/* Media type selector */}
          <Text style={styles.fieldLabel}>MEDIA TYPE</Text>
          <View style={styles.typeRow}>
            {(['movies', 'anime', 'games'] as const).map((t) => {
              const Icon = t === 'movies' ? Film : t === 'anime' ? Tv : Gamepad2;
              const label = t === 'movies' ? 'Movies' : t === 'anime' ? 'Anime' : 'Games';
              const active = mediaType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setMediaType(t); setSelectedGenres([]); haptic('light'); }}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  activeOpacity={0.8}
                >
                  <Icon size={15} color={active ? '#fff' : 'rgba(255,255,255,0.5)'} />
                  <Text style={[styles.typeBtnText, active && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Genre filter (movies only) */}
          {mediaType === 'movies' && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>FILTER GENRES</Text>
              <View style={styles.genreGrid}>
                {MOVIE_GENRES.map((g) => {
                  const active = selectedGenres.includes(g.id);
                  return (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => {
                        haptic('light');
                        setSelectedGenres((prev) =>
                          active ? prev.filter((x) => x !== g.id) : [...prev, g.id]
                        );
                      }}
                      style={[styles.genreChip, active && styles.genreChipActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genreChipText, active && { color: '#fff' }]}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={handleCreateRoom}
            disabled={actionLoading}
            style={[styles.primaryBtn, actionLoading && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#14b8a6', '#10b981']} style={styles.primaryBtnGrad}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Generate Room Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Join Card ── */}
        <View style={[styles.card2, { marginTop: 12 }]}>
          <View style={styles.card2Header}>
            <Users size={18} color="#2dd4bf" />
            <Text style={styles.card2Title}>Join a Room</Text>
          </View>
          <Text style={styles.card2Sub}>
            Enter the 6-character room code shared by your friend.
          </Text>

          <Text style={[styles.fieldLabel, { marginTop: 8 }]}>ROOM CODE</Text>
          <TextInput
            value={inputCode}
            onChangeText={(t) => setInputCode(t.toUpperCase().slice(0, 6))}
            placeholder="EX: LBY8K9"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="characters"
            maxLength={6}
            style={styles.codeInput}
          />

          <TouchableOpacity
            onPress={handleJoinRoom}
            disabled={actionLoading || inputCode.length < 6}
            style={[styles.secondaryBtn, (actionLoading || inputCode.length < 6) && { opacity: 0.5 }]}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.secondaryBtnText}>Enter Party Lobby</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── Active Lobby Screen ────────────────────────────────────────────────
  const renderLobby = () => (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.statusDot, room?.memberId ? styles.dotGreenInline : styles.dotAmberInline]} />
          <Text style={styles.topBarCode}>PARTY: {roomCode}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowPartyInfo(true)} style={styles.partyInfoBtn} activeOpacity={0.8}>
          <Users size={12} color="#2dd4bf" />
          <Text style={styles.partyInfoText}>
            Party Info{matches.length > 0 ? ` (${matches.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card area */}
      {!room?.memberId ? (
        // Waiting for guest
        <View style={styles.waitingCard}>
          <View style={styles.waitingIcon}>
            <Users size={32} color="#2dd4bf" />
          </View>
          <Text style={styles.waitingTitle}>Invite a Friend</Text>
          <Text style={styles.waitingText}>
            Share your room code to sync feeds and swipe together!
          </Text>
          <View style={styles.waitingCodeRow}>
            <Text style={styles.waitingCode}>{roomCode}</Text>
            <TouchableOpacity onPress={copyCode} style={styles.copyCodeBtn} activeOpacity={0.8}>
              {copied ? (
                <Text style={styles.copiedText}>Copied ✓</Text>
              ) : (
                <Text style={styles.copyCodeText}>Copy Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : swipingLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2dd4bf" size="large" />
          <Text style={styles.loadingText}>Loading cards…</Text>
        </View>
      ) : !activeCard ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🎬</Text>
          <Text style={styles.emptyQueueTitle}>End of Queue!</Text>
          <Text style={styles.emptyQueueText}>
            You've swiped all items. Tap Party Info → Reset Lobby to go again.
          </Text>
        </View>
      ) : (
        <SwipeCard
          card={activeCard}
          mediaType={room?.mediaType || 'movies'}
          onSwipe={handleSwipe}
          playTrailers={playTrailers}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleTrailers={() => setPlayTrailers((t) => !t)}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {!roomCode ? renderEntry() : renderLobby()}
      {renderMatchModal()}
      {renderPartyInfo()}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060d1b' },

  // Entry screen
  entryScroll: { paddingHorizontal: 16, paddingBottom: 32 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  screenTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  screenSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 24, lineHeight: 18 },

  errorBox: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 13 },

  card2: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderRadius: 24, padding: 20 },
  card2Header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  card2Title: { fontSize: 17, fontWeight: '800', color: '#fff' },
  card2Sub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, lineHeight: 18 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 10 },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'transparent' },
  typeBtnActive: { borderColor: 'rgba(45,212,191,0.4)', backgroundColor: 'rgba(45,212,191,0.08)' },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'transparent' },
  genreChipActive: { borderColor: 'rgba(45,212,191,0.4)', backgroundColor: 'rgba(45,212,191,0.1)' },
  genreChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  primaryBtn: { marginTop: 20, borderRadius: 18, overflow: 'hidden' },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  codeInput: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 6, backgroundColor: 'rgba(0,0,0,0.3)', marginBottom: 20 },
  secondaryBtn: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },

  // Swipe card
  cardWrapper: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  card: {
    width: '100%',
    flex: 1,
    maxHeight: SH * 0.62,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0a1628',
    justifyContent: 'flex-end',
  },
  voteOverlay: { position: 'absolute', top: 48, zIndex: 30, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 3 },
  likeOverlay: { left: 16, borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)' },
  passOverlay: { right: 16, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.15)' },
  likeText: { fontSize: 18, fontWeight: '900', color: '#2dd4bf', letterSpacing: 2 },
  passText: { fontSize: 18, fontWeight: '900', color: '#f87171', letterSpacing: 2 },

  topControls: { position: 'absolute', top: 12, right: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  muteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,184,166,0.15)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  scoreText: { fontSize: 13, fontWeight: '900', color: '#2dd4bf' },

  trailerToggle: { position: 'absolute', top: 12, left: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  trailerToggleLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleTrackOn: { backgroundColor: '#14b8a6' },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  toggleThumbOn: { transform: [{ translateX: 16 }] },

  cardContent: { padding: 16, zIndex: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 10 },
  cardPoster: { width: 68, height: 96, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  yearText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 4 },
  titleText: { fontSize: 21, fontWeight: '900', color: '#fff', lineHeight: 25 },
  synopsisText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 17, marginBottom: 8 },
  genrePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genrePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  genrePillText: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingTop: 16 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  passBtn: { borderColor: 'rgba(248,113,113,0.35)', backgroundColor: 'rgba(248,113,113,0.08)' },
  likeBtn: { borderColor: 'rgba(45,212,191,0.35)', backgroundColor: 'rgba(45,212,191,0.08)' },

  // Top bar (lobby)
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreenInline: { backgroundColor: '#22c55e' },
  dotAmberInline: { backgroundColor: '#f59e0b' },
  topBarCode: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  partyInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(45,212,191,0.1)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  partyInfoText: { fontSize: 11, fontWeight: '700', color: '#2dd4bf' },

  // Waiting card
  waitingCard: { flex: 1, marginHorizontal: 16, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  waitingIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(45,212,191,0.1)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  waitingTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 8 },
  waitingText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  waitingCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, width: '100%' },
  waitingCode: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  copyCodeBtn: {},
  copyCodeText: { fontSize: 12, fontWeight: '700', color: '#2dd4bf' },
  copiedText: { fontSize: 12, fontWeight: '700', color: '#22c55e' },

  // Empty states
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 },
  emptyQueueTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  emptyQueueText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },

  // Match modal
  matchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchCard: { width: '100%', maxWidth: 380, backgroundColor: '#070f1e', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)', padding: 32, alignItems: 'center' },
  matchIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(45,212,191,0.1)', borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  matchTitle: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 6 },
  matchSub: { fontSize: 14, color: '#2dd4bf', fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  matchPoster: { width: 160, height: 224, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)', marginBottom: 20 },
  matchMovieTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
  keepSwipingBtn: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  keepSwipingGrad: { paddingVertical: 16, alignItems: 'center' },
  keepSwipingText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Party info sheet
  infoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  infoSheet: { backgroundColor: '#070f1e', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24, paddingTop: 16 },
  infoHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  infoTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 20 },
  infoSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 16 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeText: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  copyBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dotGreen: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#22c55e' },
  dotAmber: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#f59e0b' },
  memberText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  categoryText: { fontSize: 15, fontWeight: '800', color: '#fff', textTransform: 'capitalize', marginBottom: 8 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  matchItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 8 },
  matchItemPoster: { width: 36, height: 50, borderRadius: 8 },
  matchItemTitle: { fontSize: 13, fontWeight: '700', color: '#fff', marginBottom: 4 },
  matchItemBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchItemBadgeText: { fontSize: 11, color: '#2dd4bf', fontWeight: '600' },
  infoActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  resetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'transparent' },
  resetBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  leaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', backgroundColor: 'rgba(248,113,113,0.08)' },
  leaveBtnText: { fontSize: 12, fontWeight: '700', color: '#f87171' },
});
