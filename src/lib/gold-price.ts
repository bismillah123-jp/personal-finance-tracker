// Gold Price API Integration with 1-second auto-refresh
// Using: https://api-harga.vercel.app/api/harga/emas

export interface GoldPriceData {
  gold: number;
  lastUpdate: string; // ISO timestamp
  source: string;
}

const API_URL = 'https://api-harga.vercel.app/api/harga/emas';

// In-memory only cache (no localStorage) for fresh data
let inMemoryCache: { data: GoldPriceData; timestamp: number } | null = null;
const MEMORY_CACHE_MS = 1000; // 1 second

/**
 * Fetch fresh gold price data from API
 */
async function fetchGoldPrice(): Promise<GoldPriceData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(API_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch gold price: ${response.statusText}`);
    }

    const json = await response.json();

    if (json.success !== true || !json.data) {
      throw new Error('API returned error status');
    }

    return {
      gold: json.data.perGram,
      lastUpdate: new Date().toISOString(),
      source: json.data.sumber || 'harga-emas.org',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get gold price data (from memory cache or API)
 */
export async function getGoldPrice(): Promise<GoldPriceData> {
  if (inMemoryCache && Date.now() - inMemoryCache.timestamp < MEMORY_CACHE_MS) {
    return inMemoryCache.data;
  }

  const freshData = await fetchGoldPrice();
  inMemoryCache = { data: freshData, timestamp: Date.now() };
  return freshData;
}

/**
 * Force refresh gold price data (bypass cache)
 */
export async function refreshGoldPrice(): Promise<GoldPriceData> {
  const freshData = await fetchGoldPrice();
  inMemoryCache = { data: freshData, timestamp: Date.now() };
  return freshData;
}

/**
 * Format last update time for display
 */
export function formatLastUpdate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 5) return 'baru saja';
  if (diffSecs < 60) return `${diffSecs} detik yang lalu`;

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins} menit yang lalu`;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours} jam yang lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
