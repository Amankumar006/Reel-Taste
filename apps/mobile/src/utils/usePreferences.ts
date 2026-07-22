import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'reel_taste_prefs_v1';
const ONBOARD_WEIGHT = 3;
const RATING_DELTA = 1;

export type Rating = 'up' | 'down';

export interface Preferences {
  onboarded: boolean;
  genres: string[];
  services: string[];
  genreWeights: Record<string, number>;
  ratings: Record<string, { rating: Rating; ratedAt: number }>;
  ratedMovieData: Record<string, any>;
}

const DEFAULT_PREFS: Preferences = {
  onboarded: true,  // skip onboarding gate — users can set genres in Prefs tab
  genres: [],
  services: [],
  genreWeights: {},
  ratings: {},
  ratedMovieData: {},
};


async function loadPrefs(): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    // Always force onboarded:true — onboarding is done via Prefs tab now
    return { ...DEFAULT_PREFS, ...JSON.parse(raw), onboarded: true };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences', e);
  }
}

interface PreferencesState {
  prefs: Preferences;
  loaded: boolean;
  load: () => Promise<void>;
  completeOnboarding: (genres: string[], services: string[]) => void;
  updateGenres: (genres: string[]) => void;
  updateServices: (services: string[]) => void;
  rateMovie: (movie: any, rating: Rating) => void;
  reset: () => void;
}

let loadPromise: Promise<Preferences> | null = null;

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  prefs: DEFAULT_PREFS,
  loaded: false,
  load: async () => {
    console.log("MOBILE_DEBUG: usePreferencesStore.load() called, current loaded =", get().loaded);
    if (get().loaded) return;

    if (!loadPromise) {
      console.log("MOBILE_DEBUG: Creating loadPromise");
      const timeout = new Promise<Preferences>((resolve) =>
        setTimeout(() => {
          console.warn('AsyncStorage loadPrefs timed out, fallback to defaults');
          resolve(DEFAULT_PREFS);
        }, 1500)
      );
      loadPromise = Promise.race([loadPrefs(), timeout]);
    }

    try {
      const p = await loadPromise;
      console.log("MOBILE_DEBUG: loadPromise resolved", p);
      set({ prefs: p, loaded: true });
      console.log("MOBILE_DEBUG: usePreferencesStore loaded set to true");
    } catch (err) {
      console.error('AsyncStorage loadPrefs failed:', err);
      set({ prefs: DEFAULT_PREFS, loaded: true });
    }
  },

  completeOnboarding: (genres, services) => {
    const weights: Record<string, number> = {};
    genres.forEach((g) => {
      weights[g] = ONBOARD_WEIGHT;
    });
    const next = { ...get().prefs, onboarded: true, genres, services, genreWeights: weights };
    set({ prefs: next });
    void savePrefs(next);
  },
  updateGenres: (genres) => {
    const next = { ...get().prefs, genres };
    set({ prefs: next });
    void savePrefs(next);
  },
  updateServices: (services) => {
    const next = { ...get().prefs, services };
    set({ prefs: next });
    void savePrefs(next);
  },
  rateMovie: (movie, rating) => {
    const prefs = get().prefs;
    const id = String(movie.id);
    const existing = prefs.ratings[id];
    const newWeights = { ...prefs.genreWeights };

    // Remove old rating delta if changing
    if (existing) {
      const delta = existing.rating === 'up' ? -RATING_DELTA : RATING_DELTA;
      movie.genres?.forEach((g: string) => {
        newWeights[g] = (newWeights[g] ?? 0) + delta;
      });
      // Toggle off if same rating
      if (existing.rating === rating) {
        const { [id]: _removed, ...remainingRatings } = prefs.ratings;
        const next = { ...prefs, ratings: remainingRatings, genreWeights: newWeights };
        set({ prefs: next });
        void savePrefs(next);
        return;
      }
    }

    // Apply new rating delta
    const delta = rating === 'up' ? RATING_DELTA : -RATING_DELTA;
    movie.genres?.forEach((g: string) => {
      newWeights[g] = (newWeights[g] ?? 0) + delta;
    });

    const next = {
      ...prefs,
      genreWeights: newWeights,
      ratings: { ...prefs.ratings, [id]: { rating, ratedAt: Date.now() } },
      ratedMovieData: { ...prefs.ratedMovieData, [id]: movie },
    };
    set({ prefs: next });
    void savePrefs(next);
  },
  reset: () => {
    set({ prefs: DEFAULT_PREFS });
    void savePrefs(DEFAULT_PREFS);
  },
}));

export function usePreferences() {
  const store = usePreferencesStore();

  useEffect(() => {
    store.load();
  }, []);

  return {
    prefs: store.prefs,
    loaded: store.loaded,
    completeOnboarding: store.completeOnboarding,
    updateGenres: store.updateGenres,
    updateServices: store.updateServices,
    rateMovie: store.rateMovie,
    reset: store.reset,
  };
}
