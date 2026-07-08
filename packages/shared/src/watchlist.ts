export interface WatchlistItem {
  id: string;
  symbol: string;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}
