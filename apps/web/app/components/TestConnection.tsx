"use client";

import { useEffect, useState } from 'react';

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [latestPrice, setLatestPrice] = useState<string>('');
  const [latestKline, setLatestKline] = useState<any>(null);

  useEffect(() => {
    console.log('Testing direct Binance WebSocket connection...');
    
    // Test direct connection to BTCUSDT kline stream
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
    
    ws.onopen = () => {
      console.log('Direct WebSocket connected successfully');
      setConnectionStatus('Connected to btcusdt@kline_1m');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received kline data:', data);
        
        if (data.e === 'kline' && data.k) {
          setLatestPrice(data.k.c);
          setLatestKline(data.k);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setConnectionStatus('Disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error');
    };

    return () => {
      ws.close();
    };
  }, []);

  // Also test ticker stream
  useEffect(() => {
    console.log('Testing ticker stream...');
    
    const tickerWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    tickerWs.onopen = () => {
      console.log('Ticker WebSocket connected');
    };

    tickerWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received ticker data:', data);
      } catch (error) {
        console.error('Error parsing ticker:', error);
      }
    };

    return () => {
      tickerWs.close();
    };
  }, []);

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg m-4">
      <h3 className="text-lg font-bold mb-4">WebSocket Connection Test</h3>
      <div className="space-y-2">
        <p><strong>Status:</strong> {connectionStatus}</p>
        <p><strong>Latest BTC Price:</strong> {latestPrice ? `$${parseFloat(latestPrice).toLocaleString()}` : 'Waiting...'}</p>
        {latestKline && (
          <div className="bg-gray-700 p-3 rounded mt-4">
            <p className="text-sm"><strong>Latest Kline:</strong></p>
            <p className="text-xs">Open: {latestKline.o}</p>
            <p className="text-xs">High: {latestKline.h}</p>
            <p className="text-xs">Low: {latestKline.l}</p>
            <p className="text-xs">Close: {latestKline.c}</p>
            <p className="text-xs">Volume: {latestKline.v}</p>
            <p className="text-xs">Closed: {latestKline.x ? 'Yes' : 'No'}</p>
          </div>
        )}
      </div>
    </div>
  );
}