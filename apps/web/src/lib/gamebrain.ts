import { promises as fs } from 'fs';
import path from 'path';

const GAMEBRAIN_API_KEY = process.env.GAMEBRAIN_API_KEY || '610bb4d149c64e42aabae50ce610d268';
const GAMEBRAIN_BASE = 'https://api.gamebrain.co/v1';
const CACHE_DIR = path.join('/tmp', 'gamebrain_cache');
const LOCK_FILE = path.join('/tmp', 'gamebrain_last_request.txt');
const RATE_LIMIT_MS = 1000; // 60 requests/minute & 1 concurrent request

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Global atomic file-based rate limiter
async function acquireRateLimitSlot() {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  while (true) {
    let lastRequest = 0;
    try {
      const data = await fs.readFile(LOCK_FILE, 'utf8');
      lastRequest = parseInt(data, 10) || 0;
    } catch {
      // Ignore if file doesn't exist
    }

    const now = Date.now();
    const elapsed = now - lastRequest;

    if (elapsed >= RATE_LIMIT_MS) {
      try {
        await fs.writeFile(LOCK_FILE, String(now), 'utf8');
        return;
      } catch {
        // Retry on write collision
      }
    } else {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
  }
}

// Generates a safe file-system compatible key for search query caches
function getSearchCacheKey(query: string): string {
  const sanitized = query
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  return `search_${sanitized || 'default'}.json`;
}

// Normalized game response matching Movie schema
export interface NormalizedGame {
  id: number;
  title: string;
  year: number | null;
  releaseDate: string | null;
  score: number; // 0-100
  synopsis: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  platforms: string[];
  link: string; // GameBrain link (backlink requirement)
  isGame: boolean;
  offers?: Array<{
    store_name: string;
    price: number | string;
    url: string;
  }>;
  screenshots?: string[];
  developer?: string;
  playtimeText?: string;
}

function normalizeGame(raw: any): NormalizedGame {
  const ratingMean = raw.rating?.mean ?? 0;
  const score = Math.round(ratingMean * 100); // rating.mean is usually 0.0 to 1.0

  return {
    id: raw.id,
    title: raw.name || 'Unknown Game',
    year: raw.year || null,
    releaseDate: raw.year ? `${raw.year}-01-01` : null,
    score: score > 0 ? score : 50, // fallback
    synopsis: raw.short_description || raw.description || '',
    posterPath: raw.image || null,
    backdropPath: raw.screenshots?.[0] || raw.image || null,
    genres: raw.genre ? [raw.genre] : [],
    platforms: Array.isArray(raw.platforms) ? raw.platforms.map((p: any) => p.name) : [],
    link: raw.link || 'https://gamebrain.co',
    isGame: true,
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
  };
}

export async function searchGames(query: string): Promise<NormalizedGame[]> {
  const cacheKey = getSearchCacheKey(query);
  const cacheFilePath = path.join(CACHE_DIR, cacheKey);

  // 1. Check Cache (7 days cache validity)
  try {
    const stats = await fs.stat(cacheFilePath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      const cacheData = await fs.readFile(cacheFilePath, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch {
    // Cache miss
  }

  // 2. Rate Limiting
  await acquireRateLimitSlot();

  // 3. API Query
  const url = `${GAMEBRAIN_BASE}/games?query=${encodeURIComponent(query)}&api-key=${GAMEBRAIN_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GameBrain API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawResults = Array.isArray(data.results) ? data.results : [];
  const normalized = rawResults.map(normalizeGame);

  // 4. Cache output
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFilePath, JSON.stringify(normalized, null, 2), 'utf8');
  } catch {
    // Ignore cache write errors
  }

  return normalized;
}

export async function getGameById(id: number): Promise<any> {
  const cacheFilePath = path.join(CACHE_DIR, `detail_${id}.json`);

  // 1. Check Cache (7 days cache validity)
  try {
    const stats = await fs.stat(cacheFilePath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < 7 * 24 * 60 * 60 * 1000) {
      const cacheData = await fs.readFile(cacheFilePath, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch {
    // Cache miss
  }

  // 2. Rate Limiting
  await acquireRateLimitSlot();

  // 3. API Query
  const url = `${GAMEBRAIN_BASE}/games/${id}?api-key=${GAMEBRAIN_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GameBrain Details API returned status ${response.status}`);
  }

  const raw = await response.json();

  // Normalise details response
  const ratingMean = raw.rating?.mean ?? 0;
  const score = Math.round(ratingMean * 100);

  const offers = Array.isArray(raw.offers)
    ? raw.offers.map((off: any) => ({
        store_name: off.store_name || 'Store',
        price: off.price?.value ? `$${off.price.value}` : 'Buy',
        url: off.url || '#',
      }))
    : [];

  const officialStores = Array.isArray(raw.official_stores)
    ? raw.official_stores.map((store: any) => ({
        store_name: store.source || 'Store',
        price: 'Official Link',
        url: store.url || '#',
      }))
    : [];

  const normalized = {
    id: raw.id,
    title: raw.name || 'Unknown Game',
    overview: raw.description || raw.short_description || '',
    releaseDate: raw.release_date || (raw.year ? `${raw.year}-01-01` : null),
    runtime: raw.playtime?.median ? raw.playtime.median * 60 : null, // median playtime in minutes
    voteAverage: ratingMean > 0 ? ratingMean * 10 : 5, // 0-10 format for detail modal
    voteCount: raw.rating?.count ?? 0,
    posterPath: raw.image || null,
    backdropPath: raw.screenshots?.[0] || raw.image || null,
    genres: Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.name) : (raw.genre ? [raw.genre] : []),
    cast: [], // games do not have actor cast maps in the details schema
    director: raw.developer ? { name: raw.developer, id: raw.developer } : null,
    trailer: raw.gameplay && raw.gameplay.includes('youtube') ? { key: raw.gameplay.split('/').pop() || '', name: 'Gameplay' } : null,
    services: [], // Map purchase offers instead
    link: raw.link || 'https://gamebrain.co',
    isGame: true,
    offers: [...offers, ...officialStores],
    screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
    playtimeText: raw.playtime?.median ? `Playtime: ~${raw.playtime.median} hours` : undefined,
  };

  // 4. Cache details
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFilePath, JSON.stringify(normalized, null, 2), 'utf8');
  } catch {
    // Ignore cache write errors
  }

  return normalized;
}
