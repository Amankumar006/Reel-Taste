// Genre and streaming service constants shared across the app.
// Movie data is now fetched live from TMDB via /api/movies.

export const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller',
];

export const SERVICES = [
  { id: 'netflix', name: 'Netflix', short: 'N' },
  { id: 'prime', name: 'Prime Video', short: 'P' },
  { id: 'disney', name: 'Disney+', short: 'D+' },
  { id: 'hulu', name: 'Hulu', short: 'H' },
  { id: 'max', name: 'Max', short: 'M' },
  { id: 'apple', name: 'Apple TV+', short: 'tv' },
];

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
