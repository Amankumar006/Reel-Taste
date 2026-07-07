import { NextRequest, NextResponse } from 'next/server';
import db from '../../utils/db';
import { ensureDbTables } from '../../utils/init_db';

export async function GET(request: NextRequest) {
  try {
    if (db.isPg) {
      await ensureDbTables();
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Fetch room
    const room = await db.getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Fetch swipes count
    const swipesCount = await db.getSwipesCount(roomCode);

    // Fetch matches
    const matches = await db.getMatches(roomCode);

    return NextResponse.json({
      code: room.code,
      hostId: room.host_id,
      memberId: room.member_id,
      mediaType: room.media_type,
      genres: room.genres,
      swipesCount,
      matches: matches.map((m: any) => ({
        mediaId: m.media_id,
        title: m.title,
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        createdAt: m.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching room status:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
