import { NextRequest, NextResponse } from 'next/server';
import db from '../../utils/db';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    if (db.isPg) {
      await ensureDbTables();
    }

    const body = await request.json();
    const { code, userId, mediaId, rating, title, posterPath, backdropPath } = body;

    if (!code || !userId || !mediaId || !rating || !title) {
      return NextResponse.json({ error: 'Missing required swipe parameters' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();
    const swipeRating = String(rating).toLowerCase() === 'up' ? 'up' : 'down';
    const cleanMediaId = String(mediaId);

    // Record swipe
    await db.recordSwipe(roomCode, userId, cleanMediaId, swipeRating);

    // If swiped down, no match possible
    if (swipeRating === 'down') {
      return NextResponse.json({ match: false });
    }

    // Fetch the room to check players
    const room = await db.getRoom(roomCode);

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const hostId = room.host_id;
    const memberId = room.member_id;

    // Only check for match if there are two players in the room
    if (hostId && memberId) {
      const otherUserId = userId === hostId ? memberId : hostId;

      // Check if the other user swiped 'up' on the same mediaId
      const otherRating = await db.checkMatch(roomCode, otherUserId, cleanMediaId);

      if (otherRating === 'up') {
        // We have a match! Add match record
        await db.addMatch(roomCode, cleanMediaId, title, posterPath || null, backdropPath || null);

        return NextResponse.json({
          match: true,
          movie: {
            mediaId: cleanMediaId,
            title,
            posterPath,
            backdropPath,
          },
        });
      }
    }

    return NextResponse.json({ match: false });
  } catch (err: any) {
    console.error('Error recording swipe:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
