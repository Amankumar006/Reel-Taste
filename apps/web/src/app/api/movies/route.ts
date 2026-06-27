const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_NAME_TO_ID: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Fantasy: 14,
  Horror: 27,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
};

const GENRE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(GENRE_NAME_TO_ID).map(([name, id]) => [id, name])
);

const PROVIDER_ID_TO_SERVICE: Record<number, string> = {
  8: 'netflix',
  9: 'prime',
  337: 'disney',
  15: 'hulu',
  1899: 'max',
  384: 'max',
  350: 'apple',
};

function normalizeMovie(movie: any, services: string[]) {
  const genres = ((movie.genre_ids ?? []) as number[])
    .map((id) => GENRE_ID_TO_NAME[id])
    .filter(Boolean) as string[];

  return {
    id: movie.id,
    title: movie.title,
    year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
    score: Math.round((movie.vote_average ?? 0) * 10),
    synopsis: movie.overview ?? '',
    genres,
    services,
    posterPath: movie.poster_path ?? null,
    backdropPath: movie.backdrop_path ?? null,
  };
}

async function fetchProviders(movieId: number, apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/${movieId}/watch/providers?api_key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    const flatrate: any[] = data?.results?.US?.flatrate ?? [];
    return flatrate
      .map((p) => PROVIDER_ID_TO_SERVICE[p.provider_id as number])
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) ?? [];
  const page = searchParams.get('page') ?? '1';

  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    sort_by: 'popularity.desc',
    page,
    include_adult: 'false',
    'vote_count.gte': '100',
  });

  if (genres.length > 0) {
    const genreIds = genres.map((g) => GENRE_NAME_TO_ID[g]).filter(Boolean);
    if (genreIds.length > 0) {
      params.set('with_genres', genreIds.join('|'));
    }
  }

  const res = await fetch(`${TMDB_BASE}/discover/movie?${params}`);
  if (!res.ok) {
    return Response.json({ error: 'Failed to fetch movies from TMDB' }, { status: 500 });
  }

  const data = await res.json();
  const rawMovies: any[] = data.results ?? [];

  // Fetch watch providers for all movies in parallel
  const providerResults = await Promise.all(
    rawMovies.map((movie) => fetchProviders(movie.id, apiKey))
  );

  const movies = rawMovies.map((movie, i) => normalizeMovie(movie, providerResults[i]));

  return Response.json({
    movies,
    page: data.page,
    totalPages: Math.min(data.total_pages, 10),
  });
}
