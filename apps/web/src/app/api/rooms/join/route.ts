import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    await ensureDbTables();

    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Check if room exists
    const rooms = await sql`
      SELECT * FROM watch_rooms WHERE code = ${roomCode}
    `;

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = rooms[0];

    // If guest joining, update member_id
    if (room.host_id !== userId && room.member_id !== userId) {
      await sql`
        UPDATE watch_rooms
        SET member_id = ${userId}
        WHERE code = ${roomCode}
      `;
      room.member_id = userId;
    }

    return NextResponse.json({
      code: room.code,
      hostId: room.host_id,
      memberId: room.member_id,
      mediaType: room.media_type,
      genres: room.genres,
    });
  } catch (err: any) {
    console.error('Error joining watch party room:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
