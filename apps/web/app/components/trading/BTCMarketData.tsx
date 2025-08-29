"use client";

import { useState, useEffect } from 'react';

interface BTCMarketDataProps {
  showDetails?: boolean;
}

export default function BTCMarketData({ showDetails = false }: BTCMarketDataProps) {
  const [tickerData, setTickerData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    console.log('BTCMarketData: Setting up direct WebSocket connection');
    
    // Direct connection to BTCUSDT ticker stream
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    ws.onopen = () => {
      console.log('BTCMarketData: WebSocket connected');
      setConnectionStatus('Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('BTCMarketData: Received ticker data', data);
        
        if (data.e === '24hrTicker') {
          setTickerData({
            price: data.c,
            priceChange: data.p,
            priceChangePercent: data.P,
            highPrice: data.h,
            lowPrice: data.l,
            volume: data.v
          });
        }
      } catch (error) {
        console.error('BTCMarketData: Error parsing data', error);
      }
    };

    ws.onclose = () => {
      console.log('BTCMarketData: WebSocket closed');
      setConnectionStatus('Disconnected');
    };

    ws.onerror = (error) => {
      console.error('BTCMarketData: WebSocket error', error);
      setConnectionStatus('Error');
    };

    return () => {
      ws.close();
    };
  }, []);

  if (!tickerData) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span>{connectionStatus}</span>
      </div>
    );
  }

  const price = parseFloat(tickerData.price);
  const change = parseFloat(tickerData.priceChange);
  const changePercent = parseFloat(tickerData.priceChangePercent);
  const isPositive = change >= 0;

  if (!showDetails) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-lg font-semibold text-white">
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`font-medium px-2 py-1 rounded text-xs ${
          isPositive 
            ? 'text-emerald-400 bg-emerald-400/10' 
            : 'text-red-400 bg-red-400/10'
        }`}>
          {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
      <div className="mb-4">
        <h4 className="text-sm text-gray-400 font-medium mb-2">BTC/USDT</h4>
        <div className="text-2xl font-semibold text-white mb-2">
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-sm font-medium px-2 py-1 rounded ${
          isPositive 
            ? 'text-emerald-400 bg-emerald-400/10' 
            : 'text-red-400 bg-red-400/10'
        }`}>
          {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-600">
          <span className="text-gray-400 text-xs">24h High:</span>
          <span className="text-white font-medium text-xs">
            ${parseFloat(tickerData.highPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-600">
          <span className="text-gray-400 text-xs">24h Low:</span>
          <span className="text-white font-medium text-xs">
            ${parseFloat(tickerData.lowPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 text-xs">24h Volume:</span>
          <span className="text-white font-medium text-xs">
            {parseFloat(tickerData.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })} BTC
          </span>
        </div>
      </div>
    </div>
  );
}