import sql from './sql';
import fs from 'fs';
import path from 'path';

const LOCAL_DB_PATH = '/tmp/rt_local_db.json';

interface LocalDbSchema {
  rooms: Record<
    string,
    {
      code: string;
      created_at: string;
      host_id: string;
      member_id: string | null;
      media_type: string;
      genres: string[];
      active_media_ids: string[];
    }
  >;
  swipes: Array<{
    room_code: string;
    user_id: string;
    media_id: string;
    rating: string;
    created_at: string;
  }>;
  matches: Array<{
    room_code: string;
    media_id: string;
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
    created_at: string;
  }>;
}

function loadLocalDb(): LocalDbSchema {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read local JSON DB:', err);
  }
  return { rooms: {}, swipes: [], matches: [] };
}

function saveLocalDb(dbData: LocalDbSchema) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save local JSON DB:', err);
  }
}

const isProductionDb = !!process.env.DATABASE_URL;

export const db = {
  isPg: isProductionDb,

  async getRoom(code: string) {
    if (isProductionDb) {
      const rows = await sql`SELECT * FROM watch_rooms WHERE code = ${code}`;
      return rows[0] || null;
    } else {
      const dbData = loadLocalDb();
      const r = dbData.rooms[code];
      if (!r) return null;
      return {
        code: r.code,
        host_id: r.host_id,
        member_id: r.member_id,
        media_type: r.media_type,
        genres: r.genres,
        created_at: r.created_at,
      };
    }
  },

  async createRoom(code: string, hostId: string, mediaType: string, genres: string[]) {
    if (isProductionDb) {
      await sql`
        INSERT INTO watch_rooms (code, host_id, media_type, genres)
        VALUES (${code}, ${hostId}, ${mediaType}, ${genres})
      `;
    } else {
      const dbData = loadLocalDb();
      dbData.rooms[code] = {
        code,
        created_at: new Date().toISOString(),
        host_id: hostId,
        member_id: null,
        media_type: mediaType,
        genres,
        active_media_ids: [],
      };
      saveLocalDb(dbData);
    }
  },

  async joinRoom(code: string, userId: string) {
    if (isProductionDb) {
      await sql`
        UPDATE watch_rooms
        SET member_id = ${userId}
        WHERE code = ${code}
      `;
    } else {
      const dbData = loadLocalDb();
      if (dbData.rooms[code]) {
        dbData.rooms[code].member_id = userId;
        saveLocalDb(dbData);
      }
    }
  },

  async getSwipesCount(code: string) {
    if (isProductionDb) {
      const rows = await sql`SELECT COUNT(*)::int as count FROM room_swipes WHERE room_code = ${code}`;
      return rows[0]?.count || 0;
    } else {
      const dbData = loadLocalDb();
      return dbData.swipes.filter((s) => s.room_code === code).length;
    }
  },

  async getMatches(code: string) {
    if (isProductionDb) {
      return await sql`SELECT * FROM room_matches WHERE room_code = ${code} ORDER BY created_at DESC`;
    } else {
      const dbData = loadLocalDb();
      return dbData.matches
        .filter((m) => m.room_code === code)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async recordSwipe(code: string, userId: string, mediaId: string, rating: string) {
    if (isProductionDb) {
      await sql`
        INSERT INTO room_swipes (room_code, user_id, media_id, rating)
        VALUES (${code}, ${userId}, ${mediaId}, ${rating})
        ON CONFLICT (room_code, user_id, media_id)
        DO UPDATE SET rating = EXCLUDED.rating
      `;
    } else {
      const dbData = loadLocalDb();
      const existingIdx = dbData.swipes.findIndex(
        (s) => s.room_code === code && s.user_id === userId && s.media_id === mediaId
      );
      if (existingIdx >= 0) {
        dbData.swipes[existingIdx].rating = rating;
      } else {
        dbData.swipes.push({
          room_code: code,
          user_id: userId,
          media_id: mediaId,
          rating,
          created_at: new Date().toISOString(),
        });
      }
      saveLocalDb(dbData);
    }
  },

  async checkMatch(code: string, otherUserId: string, mediaId: string) {
    if (isProductionDb) {
      const rows = await sql`
        SELECT rating FROM room_swipes
        WHERE room_code = ${code} AND user_id = ${otherUserId} AND media_id = ${mediaId}
      `;
      return rows[0]?.rating || null;
    } else {
      const dbData = loadLocalDb();
      const swipe = dbData.swipes.find(
        (s) => s.room_code === code && s.user_id === otherUserId && s.media_id === mediaId
      );
      return swipe?.rating || null;
    }
  },

  async addMatch(
    code: string,
    mediaId: string,
    title: string,
    posterPath: string | null,
    backdropPath: string | null
  ) {
    if (isProductionDb) {
      await sql`
        INSERT INTO room_matches (room_code, media_id, title, poster_path, backdrop_path)
        VALUES (${code}, ${mediaId}, ${title}, ${posterPath}, ${backdropPath})
        ON CONFLICT (room_code, media_id) DO NOTHING
      `;
    } else {
      const dbData = loadLocalDb();
      const matchExists = dbData.matches.some(
        (m) => m.room_code === code && m.media_id === mediaId
      );
      if (!matchExists) {
        dbData.matches.push({
          room_code: code,
          media_id: mediaId,
          title,
          poster_path: posterPath,
          backdrop_path: backdropPath,
          created_at: new Date().toISOString(),
        });
        saveLocalDb(dbData);
      }
    }
  },

  async resetRoom(code: string) {
    if (isProductionDb) {
      await sql`DELETE FROM room_swipes WHERE room_code = ${code}`;
      await sql`DELETE FROM room_matches WHERE room_code = ${code}`;
    } else {
      const dbData = loadLocalDb();
      dbData.swipes = dbData.swipes.filter((s) => s.room_code !== code);
      dbData.matches = dbData.matches.filter((m) => m.room_code !== code);
      saveLocalDb(dbData);
    }
  },
};
export default db;
