import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { ensureDbTables } from '../../utils/init_db';

export async function GET(request: NextRequest) {
  try {
    await ensureDbTables();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Fetch room
    const rooms = await sql`
      SELECT * FROM watch_rooms WHERE code = ${roomCode}
    `;

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = rooms[0];

    // Fetch swipes count
    const swipes = await sql`
      SELECT COUNT(*)::int as count FROM room_swipes WHERE room_code = ${roomCode}
    `;

    // Fetch matches
    const matches = await sql`
      SELECT * FROM room_matches WHERE room_code = ${roomCode} ORDER BY created_at DESC
    `;

    return NextResponse.json({
      code: room.code,
      hostId: room.host_id,
      memberId: room.member_id,
      mediaType: room.media_type,
      genres: room.genres,
      swipesCount: swipes[0]?.count || 0,
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
