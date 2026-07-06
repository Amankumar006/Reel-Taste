import { promises as fs } from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

// ==========================================
// TypeScript Interfaces for Raw AniDB XML
// ==========================================

export interface AniDBTitle {
  '#text'?: string | number;
  '@_type': 'main' | 'official' | 'synonym' | 'short';
  '@_xml:lang': string;
}

export interface AniDBTag {
  name: string | { '#text'?: string | number };
  '@_id': number;
  '@_parentid': number;
  '@_weight': number;
  '@_localspoiler'?: boolean | string;
}

export interface AniDBCharacter {
  name: string | { '#text'?: string | number };
  seiyuu?: string | {
    '#text'?: string | number;
    '@_id': number;
    '@_picture'?: string;
  };
  '@_id': number;
  '@_type': string;
  picture?: string;
}

export interface AniDBAnimeRaw {
  '@_id': number;
  type?: string | { '#text'?: string | number };
  episodecount?: number | { '#text'?: string | number };
  startdate?: string | { '#text'?: string | number };
  enddate?: string | { '#text'?: string | number };
  titles?: {
    title?: AniDBTitle | AniDBTitle[];
  };
  description?: string | { '#text'?: string | number };
  ratings?: {
    permanent?: string | number | { '#text'?: string | number; '@_count': number };
    temporary?: string | number | { '#text'?: string | number; '@_count': number };
  };
  picture?: string | { '#text'?: string | number };
  tags?: {
    tag?: AniDBTag | AniDBTag[];
  };
  characters?: {
    character?: AniDBCharacter | AniDBCharacter[];
  };
  creators?: {
    name?: any | any[];
  };
  url?: string | { '#text'?: string | number };
}

// ==========================================
// Normalized Output Structure
// ==========================================

export interface NormalizedAnime {
  id: number;
  title: string;
  type: string;
  episodeCount: number;
  releaseDate: string;
  endDate: string;
  score: number;
  synopsis: string;
  posterPath: string | null;
  backdropPath: string | null;
  genres: string[];
  cast: {
    id: string;
    name: string;
    character: string;
    profilePath: string | null;
    seiyuu: {
      id: string;
      name: string;
      profilePath: string | null;
    } | null;
  }[];
  director: {
    name: string;
    id: string;
  } | null;
  officialUrl: string;
}

// ==========================================
// Service Implementation
// ==========================================

const ANIDB_BASE = process.env.ANIDB_BASE_URL || 'http://api.anidb.net:9001/httpapi';
const RATE_LIMIT_MS = 2000;
const CACHE_DIR = path.join('/tmp', 'anidb_cache');
const LOCK_FILE = path.join('/tmp', 'anidb_last_request.txt');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getText(node: any): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'object') {
    return node['#text'] !== undefined ? String(node['#text']) : '';
  }
  return String(node);
}

// Atomic file-system locks to throttle requests globally across instances/runs
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
      } catch (err) {
        // Concurrent write collision, loop back to retry
      }
    } else {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
  }
}

/**
 * Fetch and parse anime details by AniDB ID (AID) with caching and rate limiting.
 * @param animeId AniDB anime ID
 * @returns Clean, normalized JSON details matching the movie schema
 */
export async function getAnimeById(animeId: number): Promise<NormalizedAnime> {
  if (isNaN(animeId) || animeId <= 0) {
    throw new Error('Invalid Anime ID (AID)');
  }

  const client = process.env.ANIDB_CLIENT || 'reeltaste';
  const clientver = process.env.ANIDB_CLIENT_VERSION || '1';
  const cacheFilePath = path.join(CACHE_DIR, `${animeId}.json`);

  // 1. Local Cache Check (24 Hours validity)
  try {
    const stats = await fs.stat(cacheFilePath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < 24 * 60 * 60 * 1000) {
      const cacheData = await fs.readFile(cacheFilePath, 'utf8');
      return JSON.parse(cacheData);
    }
  } catch {
    // Cache miss, proceed to query API
  }

  // 2. Wait for Global Rate Limiting Slot (2s throttle)
  await acquireRateLimitSlot();

  // 3. Perform the request
  const url = `${ANIDB_BASE}?request=anime&client=${client}&clientver=${clientver}&protover=1&aid=${animeId}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept-Encoding': 'gzip',
      'User-Agent': `${client}/${clientver}`,
    },
  });

  if (!response.ok) {
    throw new Error(`AniDB HTTP API error: Status ${response.status}`);
  }

  const xmlText = await response.text();

  // 4. Parse XML to Object
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });

  const parsed = parser.parse(xmlText);

  // Check for AniDB-defined API error responses (e.g. Banned, anime not found)
  if (parsed.error) {
    throw new Error(`AniDB API Error: ${getText(parsed.error)}`);
  }

  if (!parsed.anime) {
    throw new Error('Invalid response structure: missing <anime> node');
  }

  const anime: AniDBAnimeRaw = parsed.anime;

  // Extract primary display title (Prefer English Official -> Romaji Main -> Romaji Official)
  const titleNodes = Array.isArray(anime.titles?.title)
    ? anime.titles.title
    : (anime.titles?.title ? [anime.titles.title] : []);

  const englishTitleNode = titleNodes.find((t: any) => t['@_type'] === 'official' && t['@_xml:lang'] === 'en');
  const mainTitleNode = titleNodes.find((t: any) => t['@_type'] === 'main');
  const romajiTitleNode = titleNodes.find((t: any) => t['@_type'] === 'official' && t['@_xml:lang'] === 'x-jat');

  const title = getText(englishTitleNode) || getText(mainTitleNode) || getText(romajiTitleNode) || 'Unknown Anime';

  // Ratings calculation (Convert 10.0 scale to 100-based score)
  const permanentRating = anime.ratings?.permanent;
  const rawScore = permanentRating
    ? (typeof permanentRating === 'object' ? Number(permanentRating['#text'] || 0) : Number(permanentRating))
    : 0;
  const score = Math.round(rawScore * 10);

  // Cover image URL constructor
  const coverFile = getText(anime.picture);
  const posterPath = coverFile ? `https://cdn.anidb.net/images/main/${coverFile}` : null;

  // Normalise tags into genres (Only use high relevance tags >= 200, sorted descending)
  const tagNodes = Array.isArray(anime.tags?.tag)
    ? anime.tags.tag
    : (anime.tags?.tag ? [anime.tags.tag] : []);

  const genres = tagNodes
    .filter((tag: any) => Number(tag['@_weight'] || 0) >= 200)
    .sort((a: any, b: any) => Number(b['@_weight'] || 0) - Number(a['@_weight'] || 0))
    .map((tag: any) => getText(tag.name));

  // Cast normalization (Top 10)
  const charNodes = Array.isArray(anime.characters?.character)
    ? anime.characters.character
    : (anime.characters?.character ? [anime.characters.character] : []);

  const cast = charNodes.slice(0, 10).map((char: any) => {
    const seiyuu = char.seiyuu;
    return {
      id: String(char['@_id']),
      name: getText(char.name),
      character: char['@_type'] || 'Supporting',
      profilePath: char.picture ? `https://cdn.anidb.net/images/main/${char.picture}` : null,
      seiyuu: seiyuu ? {
        id: String(typeof seiyuu === 'object' ? seiyuu['@_id'] : ''),
        name: typeof seiyuu === 'object' ? getText(seiyuu) : String(seiyuu),
        profilePath: (typeof seiyuu === 'object' && seiyuu['@_picture'])
          ? `https://cdn.anidb.net/images/main/${seiyuu['@_picture']}`
          : null,
      } : null,
    };
  });

  // Creators extraction (Director)
  const creatorNodes = Array.isArray(anime.creators?.name)
    ? anime.creators.name
    : (anime.creators?.name ? [anime.creators.name] : []);

  const directorNode = creatorNodes.find((c: any) => c['@_type']?.toLowerCase() === 'direction');

  const normalizedData: NormalizedAnime = {
    id: animeId,
    title,
    type: getText(anime.type),
    episodeCount: Number(getText(anime.episodecount) || 0),
    releaseDate: getText(anime.startdate),
    endDate: getText(anime.enddate),
    score,
    synopsis: getText(anime.description),
    posterPath,
    backdropPath: posterPath, // Fallback to poster path
    genres,
    cast,
    director: directorNode ? { name: getText(directorNode), id: String(directorNode['@_id']) } : null,
    officialUrl: getText(anime.url),
  };

  // 5. Save normalized JSON cache
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFilePath, JSON.stringify(normalizedData, null, 2), 'utf8');

  return normalizedData;
}
