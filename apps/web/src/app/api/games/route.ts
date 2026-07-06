import { searchGames } from '@/lib/gamebrain';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || searchParams.get('q') || 'strategy';

  try {
    const games = await searchGames(query);
    return Response.json({ games });
  } catch (error: any) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
