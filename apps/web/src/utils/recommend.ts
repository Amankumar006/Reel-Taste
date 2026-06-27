import type { Preferences } from '@/utils/usePreferences';

interface Movie {
  id: number | string;
  genres: string[];
  services: string[];
  score: number;
  [key: string]: any;
}

export interface ScoredMovie extends Movie {
  matchScore: number;
  matchPercent: number;
  onService: boolean;
  reasons: string[];
}

const SERVICE_BONUS = 2;

// Produce a ranked list of recommendations from the catalog given a
// user's taste profile. Already-rated movies are removed from Discover.
export function getRecommendations(movies: Movie[], prefs: Preferences): ScoredMovie[] {
  const ratedIds = new Set(Object.keys(prefs.ratings || {}));
  const hasServices = prefs.services.length > 0;

  const scored = movies
    .filter((movie) => !ratedIds.has(String(movie.id)))
    .map((movie) => {
      let matchScore = 0;
      const reasons: string[] = [];

      const matchedGenres: string[] = [];
      for (const genre of movie.genres) {
        const weight = prefs.genreWeights[genre] || 0;
        matchScore += weight;
        if (weight > 0) matchedGenres.push(genre);
      }
      if (matchedGenres.length > 0) {
        reasons.push(`Matches ${matchedGenres.join(' & ')}`);
      }

      const onService = hasServices && movie.services.some((s) => prefs.services.includes(s));
      if (onService) {
        matchScore += SERVICE_BONUS;
        reasons.push('On a service you have');
      }

      // Light tie-breaker so well-reviewed films float up among equals.
      matchScore += movie.score / 100;

      return { ...movie, matchScore, onService, reasons };
    });

  const maxScore = Math.max(...scored.map((m) => m.matchScore), 1);

  return scored
    .map((movie) => ({
      ...movie,
      matchPercent: Math.max(40, Math.round((movie.matchScore / maxScore) * 100)),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
