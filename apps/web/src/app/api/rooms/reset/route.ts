import { NextRequest, NextResponse } from 'next/server';
import db from '../../utils/db';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    if (db.isPg) {
      await ensureDbTables();
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();

    // Verify room exists
    const room = await db.getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Reset room votes/matches
    await db.resetRoom(roomCode);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error resetting room session:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
