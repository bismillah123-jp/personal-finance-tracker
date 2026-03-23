"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Clock } from "lucide-react";
import { getGoldPrice, refreshGoldPrice, formatLastUpdate, type GoldPriceData } from "@/lib/gold-price";

export function GoldPriceCard() {
  const [goldData, setGoldData] = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGoldPrice = async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
        const data = await refreshGoldPrice();
        setGoldData(data);
      } else {
        setLoading(true);
        const data = await getGoldPrice();
        setGoldData(data);
      }
    } catch (err) {
      setError("Gagal memuat harga emas");
      console.error("Gold price error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGoldPrice();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Harga Emas Hari Ini</CardTitle>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Harga Emas Hari Ini</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error || "Data tidak tersedia"}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => loadGoldPrice()}
          >
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Harga Emas Hari Ini</CardTitle>
        <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Gold Price */}
          <div>
            <div className="text-2xl font-bold">{formatPrice(goldData.gold)}</div>
            <p className="text-xs text-muted-foreground">per gram</p>
          </div>

          {/* Other Metals */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Perak</p>
              <p className="text-sm font-medium">{formatPrice(goldData.silver)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platinum</p>
              <p className="text-sm font-medium">{formatPrice(goldData.platinum)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Palladium</p>
              <p className="text-sm font-medium">{formatPrice(goldData.palladium)}</p>
            </div>
          </div>

          {/* Last Update */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatLastUpdate(goldData.lastUpdate)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => loadGoldPrice(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
