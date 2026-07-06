import { getGameById } from '@/lib/gamebrain';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = parseInt(id, 10);

  if (isNaN(gameId) || gameId <= 0) {
    return Response.json({ error: 'Invalid Game ID' }, { status: 400 });
  }

  try {
    const data = await getGameById(gameId);
    return Response.json(data);
  } catch (error: any) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
}
