import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

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
  onboarded: false,
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
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
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

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    
    // 1.5s timeout safety gate to prevent hanging on device native module locks
    const timeout = new Promise<Preferences>((resolve) =>
      setTimeout(() => {
        console.warn('AsyncStorage loadPrefs timed out, fallback to defaults');
        resolve(DEFAULT_PREFS);
      }, 1500)
    );

    Promise.race([loadPrefs(), timeout])
      .then((p) => {
        if (!active) return;
        setPrefs(p);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('AsyncStorage loadPrefs failed:', err);
        if (!active) return;
        setPrefs(DEFAULT_PREFS);
        setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((next: Preferences) => {
    setPrefs(next);
    void savePrefs(next);
  }, []);

  const completeOnboarding = useCallback(
    (genres: string[], services: string[]) => {
      const weights: Record<string, number> = {};
      genres.forEach((g) => {
        weights[g] = ONBOARD_WEIGHT;
      });
      update({ ...prefs, onboarded: true, genres, services, genreWeights: weights });
    },
    [prefs, update]
  );

  const updateGenres = useCallback(
    (genres: string[]) => update({ ...prefs, genres }),
    [prefs, update]
  );

  const updateServices = useCallback(
    (services: string[]) => update({ ...prefs, services }),
    [prefs, update]
  );

  const rateMovie = useCallback(
    (movie: any, rating: Rating) => {
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
          update({ ...prefs, ratings: remainingRatings, genreWeights: newWeights });
          return;
        }
      }

      // Apply new rating delta
      const delta = rating === 'up' ? RATING_DELTA : -RATING_DELTA;
      movie.genres?.forEach((g: string) => {
        newWeights[g] = (newWeights[g] ?? 0) + delta;
      });

      update({
        ...prefs,
        genreWeights: newWeights,
        ratings: { ...prefs.ratings, [id]: { rating, ratedAt: Date.now() } },
        ratedMovieData: { ...prefs.ratedMovieData, [id]: movie },
      });
    },
    [prefs, update]
  );

  const reset = useCallback(() => {
    update(DEFAULT_PREFS);
  }, [update]);

  return { prefs, loaded, completeOnboarding, updateGenres, updateServices, rateMovie, reset };
}
