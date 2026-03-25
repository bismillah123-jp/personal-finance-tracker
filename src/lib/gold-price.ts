// Gold Price API Integration with 24-hour caching
// Using: https://api-harga.vercel.app/api/harga/emas

export interface GoldPriceData {
  gold: number;
  lastUpdate: string; // ISO timestamp
  source: string;
}

export interface GoldPriceCache {
  data: GoldPriceData;
  timestamp: number; // Unix timestamp
}

const CACHE_KEY = 'gold_price_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const API_URL = 'https://api-harga.vercel.app/api/harga/emas';

/**
 * Get cached gold price data from localStorage
 */
function getCachedData(): GoldPriceCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: GoldPriceCache = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (within 24 hours)
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading gold price cache:', error);
    return null;
  }
}

/**
 * Save gold price data to localStorage
 */
function setCachedData(data: GoldPriceData): void {
  if (typeof window === 'undefined') return;

  try {
    const cache: GoldPriceCache = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving gold price cache:', error);
  }
}

/**
 * Fetch fresh gold price data from API
 */
async function fetchGoldPrice(): Promise<GoldPriceData> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch gold price: ${response.statusText}`);
  }

  const json = await response.json();

  if (json.success !== true || !json.data) {
    throw new Error('API returned error status');
  }

  return {
    gold: json.data.perGram,
    lastUpdate: json.data.terakhirUpdate || new Date().toISOString(),
    source: json.data.sumber || 'harga-emas.org',
  };
}

/**
 * Get gold price data (from cache or API)
 * Automatically handles 24-hour caching
 */
export async function getGoldPrice(): Promise<GoldPriceData> {
  // Try to get from cache first
  const cached = getCachedData();
  if (cached) {
    return cached.data;
  }

  // Cache miss or expired, fetch fresh data
  const freshData = await fetchGoldPrice();
  setCachedData(freshData);

  return freshData;
}

/**
 * Force refresh gold price data (bypass cache)
 */
export async function refreshGoldPrice(): Promise<GoldPriceData> {
  const freshData = await fetchGoldPrice();
  setCachedData(freshData);
  return freshData;
}

/**
 * Get time until next cache refresh
 */
export function getTimeUntilRefresh(): number | null {
  const cached = getCachedData();
  if (!cached) return null;

  const expiresAt = cached.timestamp + CACHE_DURATION;
  const remaining = expiresAt - Date.now();

  return remaining > 0 ? remaining : 0;
}

/**
 * Check if cache needs refresh
 */
export function needsRefresh(): boolean {
  const cached = getCachedData();
  if (!cached) return true;

  const now = Date.now();
  return now - cached.timestamp >= CACHE_DURATION;
}

/**
 * Format last update time for display
 */
export function formatLastUpdate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} menit yang lalu`;
  }

  if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  }

  // Format as date
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
