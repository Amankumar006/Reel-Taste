import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { ensureDbTables } from '../../utils/init_db';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbTables();

    const body = await request.json();
    const { userId, mediaType, genres } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let code = generateRoomCode();
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      const rows = await sql`SELECT code FROM watch_rooms WHERE code = ${code}`;
      if (rows.length === 0) {
        exists = false;
      } else {
        code = generateRoomCode();
      }
      attempts++;
    }

    const type = mediaType || 'movies';
    const genreList = genres || [];

    await sql`
      INSERT INTO watch_rooms (code, host_id, media_type, genres)
      VALUES (${code}, ${userId}, ${type}, ${genreList})
    `;

    return NextResponse.json({
      code,
      hostId: userId,
      mediaType: type,
      genres: genreList,
    });
  } catch (err: any) {
    console.error('Error creating watch party room:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
