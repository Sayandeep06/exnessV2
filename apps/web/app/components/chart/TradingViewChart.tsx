"use client";

import { useEffect, useRef, useState } from 'react';

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandleMessage {
  type: 'candle';
  data: {
    symbol: string;
    interval: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    tradeCount: number;
  };
}

export default function TradingViewChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [currentInterval, setCurrentInterval] = useState('1m');

  // Load TradingView script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      console.log('TradingView script loaded');
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load TradingView script');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Set up WebSocket for live kline data
  useEffect(() => {
    console.log('Setting up kline WebSocket connection');
    
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      console.log('Kline WebSocket connected');
      setConnectionStatus('Connected');
      
      // Subscribe to BTCUSDT 1m candles by default
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'btcusdt',
        interval: '1m'
      }));
    };

    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'candle' && message.data) {
          const candle = message.data;
          
          const newKlineData: KlineData = {
            time: candle.timestamp, // Already in seconds
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          };

          setKlineData(prev => {
            const updated = [...prev];
            const existingIndex = updated.findIndex(item => item.time === newKlineData.time);
            
            if (existingIndex !== -1) {
              updated[existingIndex] = newKlineData;
            } else {
              updated.push(newKlineData);
              if (updated.length > 1000) {
                updated.shift();
              }
            }
            
            return updated.sort((a, b) => a.time - b.time);
          });
        } else if (message.status) {
          console.log('Subscription status:', message);
        } else if (message.error) {
          console.error('WebSocket error:', message.error);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message', error);
      }
    };

    ws.onclose = () => {
      console.log('Kline WebSocket closed');
      setConnectionStatus('Disconnected');
    };

    ws.onerror = (error) => {
      console.error('Kline WebSocket error', error);
      setConnectionStatus('Error');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // Initialize TradingView widget
  useEffect(() => {
    if (!isScriptLoaded || !chartContainerRef.current || !window.TradingView || klineData.length === 0) {
      return;
    }

    console.log('Initializing TradingView widget with', klineData.length, 'candles');

    // Create datafeed for TradingView
    const datafeed = {
      onReady: (callback: any) => {
        setTimeout(() => {
          callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true
          });
        }, 0);
      },

      resolveSymbol: (symbolName: string, onResolve: any) => {
        setTimeout(() => {
          onResolve({
            name: 'BTCUSDT',
            full_name: 'Binance:BTCUSDT',
            description: 'Bitcoin/USDT',
            type: 'crypto',
            session: '24x7',
            exchange: 'Binance',
            listed_exchange: 'Binance',
            timezone: 'Etc/UTC',
            format: 'price',
            pricescale: 100,
            minmov: 1,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
            has_daily: true,
            has_weekly_and_monthly: true,
            volume_precision: 2
          });
        }, 0);
      },

      getBars: (symbolInfo: any, resolution: string, periodParams: any, onResult: any) => {
        try {
          console.log('TradingView requesting bars:', periodParams);
          
          // Convert klineData to TradingView format
          const bars = klineData
            .filter(candle => {
              const candleTime = candle.time;
              return candleTime >= periodParams.from && candleTime <= periodParams.to;
            })
            .map(candle => ({
              time: candle.time * 1000, // Convert back to milliseconds
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume
            }));

          console.log('Returning', bars.length, 'bars to TradingView');
          onResult(bars, { noData: bars.length === 0 });
        } catch (error) {
          console.error('Error in getBars:', error);
          onResult([], { noData: true });
        }
      },

      subscribeBars: () => {
        // We'll handle real-time updates through our WebSocket
      },

      unsubscribeBars: () => {
        // No action needed
      }
    };

    try {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
      }

      tvWidgetRef.current = new window.TradingView.widget({
        symbol: 'BTCUSDT',
        datafeed: datafeed,
        interval: '1',
        container: chartContainerRef.current,
        library_path: 'https://unpkg.com/charting_library@latest/',
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'header_symbol_search'
        ],
        enabled_features: [
          'study_templates'
        ],
        fullscreen: false,
        autosize: true,
        studies_overrides: {},
        theme: 'dark',
        custom_css_url: '',
        toolbar_bg: '#1e222d',
        loading_screen: { 
          backgroundColor: '#1e222d',
          foregroundColor: '#ffffff'
        }
      });

      tvWidgetRef.current.onChartReady(() => {
        console.log('TradingView chart ready');
      });

    } catch (error) {
      console.error('Error creating TradingView widget:', error);
    }

    return () => {
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.remove();
          tvWidgetRef.current = null;
        } catch (error) {
          console.error('Error removing TradingView widget:', error);
        }
      }
    };
  }, [isScriptLoaded, klineData]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Status indicator */}
      <div className="absolute top-2 right-2 z-10">
        <span className={`text-xs px-2 py-1 rounded ${
          connectionStatus === 'Connected' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {connectionStatus} • {klineData.length} candles
        </span>
      </div>

      {/* TradingView container */}
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Loading indicator */}
      {!isScriptLoaded || klineData.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-2"></div>
            <p className="text-gray-400 text-sm">
              {!isScriptLoaded ? 'Loading TradingView...' : 'Waiting for kline data...'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}