import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { ensureDbTables } from '../../utils/init_db';

export async function POST(request: NextRequest) {
  try {
    await ensureDbTables();

    const body = await request.json();
    const { code, userId, mediaId, rating, title, posterPath, backdropPath } = body;

    if (!code || !userId || !mediaId || !rating || !title) {
      return NextResponse.json({ error: 'Missing required swipe parameters' }, { status: 400 });
    }

    const roomCode = String(code).trim().toUpperCase();
    const swipeRating = String(rating).toLowerCase() === 'up' ? 'up' : 'down';
    const cleanMediaId = String(mediaId);

    // Upsert swipe
    await sql`
      INSERT INTO room_swipes (room_code, user_id, media_id, rating)
      VALUES (${roomCode}, ${userId}, ${cleanMediaId}, ${swipeRating})
      ON CONFLICT (room_code, user_id, media_id)
      DO UPDATE SET rating = EXCLUDED.rating
    `;

    // If swiped down, no match possible
    if (swipeRating === 'down') {
      return NextResponse.json({ match: false });
    }

    // Fetch the room to check players
    const rooms = await sql`
      SELECT * FROM watch_rooms WHERE code = ${roomCode}
    `;

    if (rooms.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = rooms[0];
    const hostId = room.host_id;
    const memberId = room.member_id;

    // Only check for match if there are two players in the room
    if (hostId && memberId) {
      const otherUserId = userId === hostId ? memberId : hostId;

      // Check if the other user swiped 'up' on the same mediaId
      const otherSwipes = await sql`
        SELECT rating FROM room_swipes
        WHERE room_code = ${roomCode} AND user_id = ${otherUserId} AND media_id = ${cleanMediaId}
      `;

      if (otherSwipes.length > 0 && otherSwipes[0].rating === 'up') {
        // We have a match! Insert into matches table
        await sql`
          INSERT INTO room_matches (room_code, media_id, title, poster_path, backdrop_path)
          VALUES (${roomCode}, ${cleanMediaId}, ${title}, ${posterPath || null}, ${backdropPath || null})
          ON CONFLICT (room_code, media_id) DO NOTHING
        `;

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
