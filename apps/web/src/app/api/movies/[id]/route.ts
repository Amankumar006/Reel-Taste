const TMDB_BASE = 'https://api.themoviedb.org/3';

const PROVIDER_ID_TO_SERVICE: Record<number, string> = {
  8: 'netflix',
  9: 'prime',
  337: 'disney',
  15: 'hulu',
  1899: 'max',
  384: 'max',
  350: 'apple',
};

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 });
  }

  const { id } = await params;

  // Fetch movie details, credits, and videos in parallel
  const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/${id}?api_key=${apiKey}&language=en-US`),
    fetch(`${TMDB_BASE}/movie/${id}/credits?api_key=${apiKey}`),
    fetch(`${TMDB_BASE}/movie/${id}/videos?api_key=${apiKey}&language=en-US`),
    fetch(`${TMDB_BASE}/movie/${id}/watch/providers?api_key=${apiKey}`),
  ]);

  if (!detailsRes.ok) {
    return Response.json({ error: 'Movie not found' }, { status: 404 });
  }

  const details = await detailsRes.json();
  const credits = creditsRes.ok ? await creditsRes.json() : { cast: [] };
  const videos = videosRes.ok ? await videosRes.json() : { results: [] };
  const providersData = providersRes.ok ? await providersRes.json() : null;

  // Extract cast (top 10)
  const cast = (credits.cast || []).slice(0, 10).map((person: any) => ({
    id: person.id,
    name: person.name,
    character: person.character,
    profilePath: person.profile_path,
  }));

  // Extract director
  const director = (credits.crew || []).find((person: any) => person.job === 'Director');

  // Extract trailer (prefer YouTube official trailer)
  const trailer =
    (videos.results || []).find(
      (v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official === true
    ) || (videos.results || []).find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');

  // Extract watch providers
  const flatrate: any[] = providersData?.results?.US?.flatrate ?? [];
  const services = flatrate
    .map((p) => ({
      id: PROVIDER_ID_TO_SERVICE[p.provider_id as number],
      name: p.provider_name,
      logoPath: p.logo_path,
    }))
    .filter((s) => s.id) as { id: string; name: string; logoPath: string }[];

  // Map genres
  const genres = (details.genres || []).map((g: any) => g.name);

  return Response.json({
    id: details.id,
    title: details.title,
    tagline: details.tagline || null,
    overview: details.overview || '',
    releaseDate: details.release_date || null,
    runtime: details.runtime || null,
    voteAverage: details.vote_average || 0,
    voteCount: details.vote_count || 0,
    posterPath: details.poster_path || null,
    backdropPath: details.backdrop_path || null,
    genres,
    cast,
    director: director ? { name: director.name, id: director.id } : null,
    trailer: trailer ? { key: trailer.key, name: trailer.name } : null,
    services,
  });
}
