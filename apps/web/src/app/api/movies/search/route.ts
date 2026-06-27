const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_ID_TO_NAME: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
};

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

export async function GET(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';
  const page = searchParams.get('page') ?? '1';

  if (!query.trim()) {
    return Response.json({ movies: [], page: 1, totalPages: 0 });
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    language: 'en-US',
    query,
    page,
    include_adult: 'false',
  });

  const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);
  if (!res.ok) {
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }

  const data = await res.json();
  const rawMovies: any[] = (data.results ?? []).filter((m: any) => m.vote_count > 20);

  // Fetch providers in parallel
  const providerResults = await Promise.all(
    rawMovies.map(async (movie) => {
      try {
        const r = await fetch(`${TMDB_BASE}/movie/${movie.id}/watch/providers?api_key=${apiKey}`);
        if (!r.ok) return [];
        const d = await r.json();
        const flatrate: any[] = d?.results?.US?.flatrate ?? [];
        return flatrate
          .map((p) => PROVIDER_ID_TO_SERVICE[p.provider_id as number])
          .filter(Boolean) as string[];
      } catch {
        return [];
      }
    })
  );

  const movies = rawMovies.map((movie, i) => normalizeMovie(movie, providerResults[i]));

  return Response.json({
    movies,
    page: data.page,
    totalPages: data.total_pages,
  });
}
