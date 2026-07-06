import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_KEY = 'reel_watchlist_v1';

interface WatchlistState {
  watchlist: Record<string, any>;
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (movie: any) => boolean;
  isInWatchlist: (id: string | number) => boolean;
}

let watchlistLoadPromise: Promise<Record<string, any>> | null = null;

async function loadWatchlist(): Promise<Record<string, any>> {
  try {
    const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
    if (raw) return JSON.parse(raw);
    return {};
  } catch {
    return {};
  }
}

async function saveWatchlist(data: Record<string, any>): Promise<void> {
  try {
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save watchlist:', err);
  }
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  watchlist: {},
  loaded: false,
  load: async () => {
    if (get().loaded) return;

    if (!watchlistLoadPromise) {
      const timeout = new Promise<Record<string, any>>((resolve) =>
        setTimeout(() => {
          console.warn('AsyncStorage loadWatchlist timed out, fallback to empty');
          resolve({});
        }, 1500)
      );
      watchlistLoadPromise = Promise.race([loadWatchlist(), timeout]);
    }

    try {
      const data = await watchlistLoadPromise;
      set({ watchlist: data, loaded: true });
    } catch {
      set({ watchlist: {}, loaded: true });
    }
  },
  toggle: (movie) => {
    const id = String(movie.id);
    const current = { ...get().watchlist };
    let added = false;

    if (current[id]) {
      delete current[id];
    } else {
      current[id] = movie;
      added = true;
    }

    set({ watchlist: current });
    void saveWatchlist(current);
    return added;
  },
  isInWatchlist: (id) => !!get().watchlist[String(id)],
}));

export function useWatchlist() {
  const store = useWatchlistStore();

  useEffect(() => {
    store.load();
  }, []);

  const movies = Object.values(store.watchlist).reverse();
  const count = movies.length;

  return {
    watchlist: store.watchlist,
    movies,
    count,
    toggle: store.toggle,
    isInWatchlist: store.isInWatchlist,
    loaded: store.loaded,
  };
}
