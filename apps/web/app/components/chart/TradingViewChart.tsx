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

interface Props {
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onPriceUpdate: (price: number) => void;
  onConnectionChange: (connected: boolean) => void;
}

export default function TradingViewChart({ 
  selectedTimeframe, 
  onTimeframeChange, 
  onPriceUpdate,
  onConnectionChange 
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [klineData, setKlineData] = useState<KlineData[]>([]);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  
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

  
  useEffect(() => {
    console.log('Setting up WebSocket connection to local server');
    
    const ws = new WebSocket('ws://localhost:3492');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to local server');
      setConnectionStatus('Connected');
      onConnectionChange(true);
      
      
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'btcusdt',
        interval: selectedTimeframe,
        type: 'candles'
      }));

      
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'btcusdt',
        type: 'positions',
        userId: 1 
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'candle' && message.data) {
          const candle = message.data;
          
          const newKlineData: KlineData = {
            time: candle.timestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          };

          
          onPriceUpdate(candle.close);

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
          
        } else if (message.type === 'price_update' && message.data) {
          
          onPriceUpdate(message.data.mid);
          
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
      console.log('WebSocket closed');
      setConnectionStatus('Disconnected');
      onConnectionChange(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
      setConnectionStatus('Error');
      onConnectionChange(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [selectedTimeframe, onPriceUpdate, onConnectionChange]);

  
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      
      wsRef.current.send(JSON.stringify({
        action: 'unsubscribe',
        symbol: 'btcusdt',
        interval: selectedTimeframe,
        type: 'candles'
      }));

      
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        symbol: 'btcusdt',
        interval: selectedTimeframe,
        type: 'candles'
      }));

      
      setKlineData([]);
    }
  }, [selectedTimeframe]);

  
  useEffect(() => {
    if (!isScriptLoaded || !chartContainerRef.current || !(window as any).TradingView) {
      return;
    }

    console.log('Initializing TradingView widget');

    
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
            full_name: 'Exness:BTCUSDT',
            description: 'Bitcoin/USDT',
            type: 'crypto',
            session: '24x7',
            exchange: 'Exness',
            listed_exchange: 'Exness',
            timezone: 'Etc/UTC',
            format: 'price',
            pricescale: 1,
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
          console.log('TradingView requesting bars for resolution:', resolution);
          
          
          const bars = klineData
            .filter(candle => {
              const candleTime = candle.time;
              return candleTime >= periodParams.from && candleTime <= periodParams.to;
            })
            .sort((a, b) => a.time - b.time) 
            .map(candle => ({
              time: candle.time * 1000, 
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume
            }));

          console.log(`Returning ${bars.length} bars to TradingView`);
          onResult(bars, { noData: bars.length === 0 });
        } catch (error) {
          console.error('Error in getBars:', error);
          onResult([], { noData: true });
        }
      },

      subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: any) => {
        console.log('TradingView subscribing to real-time bars');
        
        
      },

      unsubscribeBars: () => {
        console.log('TradingView unsubscribing from real-time bars');
      }
    };

    try {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
      }

      tvWidgetRef.current = new (window as any).TradingView.widget({
        symbol: 'BTCUSDT',
        datafeed: datafeed,
        interval: selectedTimeframe === '1m' ? '1' : selectedTimeframe === '5m' ? '5' : '15',
        container: chartContainerRef.current,
        library_path: 'https://unpkg.com/charting_library@latest/',
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'header_symbol_search',
          'symbol_search_hot_key',
          'compare_symbol'
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode'
        ],
        fullscreen: false,
        autosize: true,
        studies_overrides: {},
        theme: 'dark',
        custom_css_url: '',
        toolbar_bg: '#1f2937',
        loading_screen: { 
          backgroundColor: '#1f2937',
          foregroundColor: '#ffffff'
        },
        overrides: {
          'paneProperties.background': '#1f2937',
          'paneProperties.vertGridProperties.color': '#374151',
          'paneProperties.horzGridProperties.color': '#374151',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#9ca3af',
          'mainSeriesProperties.candleStyle.upColor': '#10b981',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
          'mainSeriesProperties.candleStyle.drawWick': true,
          'mainSeriesProperties.candleStyle.drawBorder': true,
          'mainSeriesProperties.candleStyle.borderColor': '#374151',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
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
  }, [isScriptLoaded, selectedTimeframe]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 relative">
      
      <div className="absolute top-2 right-2 z-10">
        <span className={`text-xs px-2 py-1 rounded ${
          connectionStatus === 'Connected' 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {connectionStatus} • {klineData.length} candles
        </span>
      </div>

      
      <div
        ref={chartContainerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      
      {(!isScriptLoaded || klineData.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-2 mx-auto"></div>
            <p className="text-gray-400 text-sm">
              {!isScriptLoaded ? 'Loading TradingView...' : 'Waiting for candle data...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}