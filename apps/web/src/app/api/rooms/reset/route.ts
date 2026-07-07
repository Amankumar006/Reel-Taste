import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    await ensureDbTables();

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Verify room exists
    const rooms = await sql`
      SELECT code FROM watch_rooms WHERE code = ${roomCode}
    `;

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Delete swipes and matches
    await sql`
      DELETE FROM room_swipes WHERE room_code = ${roomCode}
    `;

    await sql`
      DELETE FROM room_matches WHERE room_code = ${roomCode}
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting room session:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
