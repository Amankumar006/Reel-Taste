-- watch_rooms Table
CREATE TABLE IF NOT EXISTS watch_rooms (
  code VARCHAR(6) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  host_id VARCHAR(255) NOT NULL,
  member_id VARCHAR(255),
  media_type VARCHAR(50) DEFAULT 'movies',
  genres VARCHAR(255)[] DEFAULT '{}',
  active_media_ids VARCHAR(255)[] DEFAULT '{}'
);

-- room_swipes Table
CREATE TABLE IF NOT EXISTS room_swipes (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) REFERENCES watch_rooms(code) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  media_id VARCHAR(255) NOT NULL,
  rating VARCHAR(10) NOT NULL, -- 'up' or 'down'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_code, user_id, media_id)
);

-- room_matches Table
CREATE TABLE IF NOT EXISTS room_matches (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(6) REFERENCES watch_rooms(code) ON DELETE CASCADE,
  media_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  poster_path VARCHAR(255),
  backdrop_path VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_code, media_id)
);
