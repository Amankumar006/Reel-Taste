const SERVICE_BONUS = 2;

export interface ScoredMovie {
  id: number | string;
  title: string;
  year?: number | null;
  score?: number;
  synopsis?: string;
  genres: string[];
  services?: string[];
  posterPath?: string | null;
  backdropPath?: string | null;
  matchScore: number;
  matchPercent: number;
  onService: boolean;
  reasons: string[];
  [key: string]: any;
}

export function getRecommendations(movies: any[], prefs: any): ScoredMovie[] {
  if (!movies || movies.length === 0) return [];

  const scored: ScoredMovie[] = movies
    .filter((movie) => !prefs.ratings[String(movie.id)])
    .map((movie) => {
      const matchedGenres = movie.genres.filter((g: string) => (prefs.genreWeights[g] ?? 0) > 0);
      const genreScore = movie.genres.reduce(
        (sum: number, g: string) => sum + (prefs.genreWeights[g] ?? 0),
        0
      );
      const onService =
        prefs.services.length > 0 &&
        (movie.services ?? []).some((s: string) => prefs.services.includes(s));
      const serviceScore = onService ? SERVICE_BONUS : 0;
      const tieBreaker = (movie.score ?? 0) / 100;
      const matchScore = genreScore + serviceScore + tieBreaker;

      const reasons: string[] = [];
      if (matchedGenres.length > 0) {
        reasons.push(`Matches ${matchedGenres.slice(0, 2).join(' & ')}`);
      }
      if (onService) {
        reasons.push('On a service you have');
      }

      return {
        ...movie,
        matchScore,
        matchPercent: 0,
        onService,
        reasons,
      };
    });

  const maxScore = Math.max(...scored.map((m) => m.matchScore), 1);

  return scored
    .map((m) => ({
      ...m,
      matchPercent: Math.max(40, Math.round((m.matchScore / maxScore) * 100)),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
