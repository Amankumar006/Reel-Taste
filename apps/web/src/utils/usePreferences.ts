'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'reel_taste_prefs_v1';

export type Rating = 'up' | 'down';

export interface RatedEntry {
  rating: Rating;
  ratedAt: number;
}

export interface Preferences {
  onboarded: boolean;
  genres: string[];
  services: string[];
  genreWeights: Record<string, number>;
  ratings: Record<string, RatedEntry>;
  ratedMovieData: Record<string, any>; // full movie objects cached for the Rated tab
}

interface RatableMovie {
  id: number | string;
  genres: string[];
  [key: string]: any;
}

const DEFAULT_PREFS: Preferences = {
  onboarded: false,
  genres: [],
  services: [],
  genreWeights: {},
  ratings: {},
  ratedMovieData: {},
};

// Base weight applied to genres chosen during onboarding.
const ONBOARD_WEIGHT = 3;
// How much a single thumbs up/down nudges each of a movie's genres.
const RATING_DELTA = 1;

function readStorage(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed };
  } catch (error) {
    console.error('Could not read saved preferences', error);
    return DEFAULT_PREFS;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatches.
  useEffect(() => {
    setPrefs(readStorage());
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Preferences) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Could not save preferences', error);
    }
  }, []);

  const completeOnboarding = useCallback(
    (genres: string[], services: string[]) => {
      const genreWeights: Record<string, number> = {};
      for (const genre of genres) {
        genreWeights[genre] = ONBOARD_WEIGHT;
      }
      persist({
        onboarded: true,
        genres,
        services,
        genreWeights,
        ratings: {},
        ratedMovieData: {},
      });
    },
    [persist]
  );

  const updateGenres = useCallback(
    (genres: string[]) => {
      const genreWeights = { ...prefs.genreWeights };
      for (const genre of genres) {
        if (genreWeights[genre] === undefined) {
          genreWeights[genre] = ONBOARD_WEIGHT;
        }
      }
      persist({ ...prefs, genres, genreWeights });
    },
    [prefs, persist]
  );

  const updateServices = useCallback(
    (services: string[]) => {
      persist({ ...prefs, services });
    },
    [prefs, persist]
  );

  const rateMovie = useCallback(
    (movie: RatableMovie, rating: Rating) => {
      const key = String(movie.id);
      const previous = prefs.ratings[key];
      const genreWeights = { ...prefs.genreWeights };

      if (previous) {
        const prevDelta = previous.rating === 'up' ? RATING_DELTA : -RATING_DELTA;
        for (const genre of movie.genres) {
          genreWeights[genre] = (genreWeights[genre] || 0) - prevDelta;
        }
      }

      const ratings = { ...prefs.ratings };
      const ratedMovieData = { ...prefs.ratedMovieData, [key]: movie };

      if (previous && previous.rating === rating) {
        delete ratings[key];
        persist({ ...prefs, genreWeights, ratings, ratedMovieData });
        return;
      }

      const delta = rating === 'up' ? RATING_DELTA : -RATING_DELTA;
      for (const genre of movie.genres) {
        genreWeights[genre] = (genreWeights[genre] || 0) + delta;
      }
      ratings[key] = { rating, ratedAt: Date.now() };
      persist({ ...prefs, genreWeights, ratings, ratedMovieData });
    },
    [prefs, persist]
  );

  const reset = useCallback(() => {
    persist(DEFAULT_PREFS);
  }, [persist]);

  return {
    prefs,
    loaded,
    completeOnboarding,
    updateGenres,
    updateServices,
    rateMovie,
    reset,
  };
}
