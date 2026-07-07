import { NextRequest, NextResponse } from 'next/server';
import db from '../../utils/db';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    if (db.isPg) {
      await ensureDbTables();
    }

    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({ error: 'Missing userId or room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Check if room exists
    const room = await db.getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // If guest joining, update member_id
    if (room.host_id !== userId && room.member_id !== userId) {
      await db.joinRoom(roomCode, userId);
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
