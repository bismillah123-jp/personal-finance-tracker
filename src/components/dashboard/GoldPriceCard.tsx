"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Wifi } from "lucide-react";
import { getGoldPrice, formatLastUpdate, type GoldPriceData } from "@/lib/gold-price";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/components/providers";

export function GoldPriceCard() {
  const { currency, locale } = useAuth();
  const [goldData, setGoldData] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadGoldPrice = async () => {
    try {
      setError(null);
      const data = await getGoldPrice();
      setGoldData(data);
      setLastRefresh(data.lastUpdate);
    } catch (err) {
      setError("Gagal memuat harga emas");
      console.error("Gold price error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoldPrice();

    // Auto-refresh every 1 second
    intervalRef.current = setInterval(() => {
      loadGoldPrice();
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update the relative time display every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(tickInterval);
  }, []);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Harga Emas Live</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !goldData) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Harga Emas Live</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || "Data tidak tersedia"}</p>
          <button
            onClick={loadGoldPrice}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Coba lagi
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-yellow-200/50 dark:border-yellow-900/40">
      <div className="h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Harga Emas Live</CardTitle>
        <div className="flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">LIVE</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {formatCurrency(goldData.gold, currency, locale)}
            </div>
            <p className="text-xs text-muted-foreground">per gram</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatLastUpdate(lastRefresh)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Auto-refresh 1s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
