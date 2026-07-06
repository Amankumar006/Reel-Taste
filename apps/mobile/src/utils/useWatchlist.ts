import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const WATCHLIST_KEY = 'reel_watchlist_v1';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (active) {
        console.warn('AsyncStorage useWatchlist timed out, fallback to defaults');
        setLoaded(true);
      }
    }, 1500);

    AsyncStorage.getItem(WATCHLIST_KEY)
      .then((raw) => {
        clearTimeout(timer);
        if (!active) return;
        if (raw) setWatchlist(JSON.parse(raw));
        setLoaded(true);
      })
      .catch(() => {
        clearTimeout(timer);
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const persist = useCallback((next: Record<string, any>) => {
    setWatchlist(next);
    AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next)).catch(console.error);
  }, []);

  /** Toggle a movie in/out of watchlist. Returns true if added. */
  const toggle = useCallback(
    (movie: any): boolean => {
      const id = String(movie.id);
      const next = { ...watchlist };
      if (next[id]) {
        delete next[id];
        persist(next);
        return false;
      }
      next[id] = movie;
      persist(next);
      return true;
    },
    [watchlist, persist]
  );

  const isInWatchlist = useCallback((id: string | number) => !!watchlist[String(id)], [watchlist]);

  const movies = Object.values(watchlist).reverse();
  const count = movies.length;

  return { watchlist, movies, count, toggle, isInWatchlist, loaded };
}
