import { getAnimeById } from '@/lib/anidb';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aid = parseInt(id, 10);

  if (isNaN(aid) || aid <= 0) {
    return Response.json({ error: 'Invalid Anime ID (AID)' }, { status: 400 });
  }

  try {
    const data = await getAnimeById(aid);
    return Response.json(data);
  } catch (error: any) {
    const status = error.message?.includes('not found') || error.message?.includes('Error:') ? 404 : 500;
    return Response.json({ error: error.message || String(error) }, { status });
  }
}
