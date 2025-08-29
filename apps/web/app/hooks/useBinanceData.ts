"use client";

import { useState, useEffect, useCallback } from 'react';
import { binanceWS } from '../utils/binanceWebSocket';
import { KlineData, TickerData, ChartData } from '../types/trading';

export function useKlineData(symbol: string, interval: string = '1m') {
  const [klineData, setKlineData] = useState<ChartData[]>([]);
  const [latestKline, setLatestKline] = useState<KlineData | null>(null);

  const processKlineData = useCallback((data: KlineData) => {
    console.log('Processing kline data:', data);
    setLatestKline(data);
    
    const chartBar: ChartData = {
      time: data.openTime,
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      close: parseFloat(data.close),
      volume: parseFloat(data.volume)
    };

    setKlineData(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(bar => bar.time === chartBar.time);
      
      if (existingIndex !== -1) {
        updated[existingIndex] = chartBar;
      } else {
        updated.push(chartBar);
        updated.sort((a, b) => a.time - b.time);
      }
      
      return updated.slice(-1000);
    });
  }, []);

  useEffect(() => {
    if (symbol) {
      console.log('Subscribing to kline for symbol:', symbol, 'interval:', interval);
      binanceWS.subscribeToKline(symbol, interval, processKlineData);
      
      return () => {
        binanceWS.unsubscribe(symbol, 'kline', interval);
      };
    }
  }, [symbol, interval, processKlineData]);

  return { klineData, latestKline };
}

export function useTickerData(symbol?: string) {
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [allTickers, setAllTickers] = useState<TickerData[]>([]);

  useEffect(() => {
    if (symbol) {
      console.log('Subscribing to ticker for symbol:', symbol);
      binanceWS.subscribeToTicker(symbol, (data) => {
        console.log('Received ticker data:', data);
        setTickerData(data);
      });
      
      return () => {
        binanceWS.unsubscribe(symbol, 'ticker');
      };
    }
  }, [symbol]);

  return symbol ? { tickerData } : { allTickers };
}

export function useHistoricalKlines(symbol: string, interval: string = '1m', limit: number = 500) {
  const [historicalData, setHistoricalData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const chartData: ChartData[] = data.map((kline: any[]) => ({
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
      
      setHistoricalData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
      console.error('Error fetching historical klines:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, limit]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return { historicalData, loading, error, refetch: fetchHistoricalData };
}