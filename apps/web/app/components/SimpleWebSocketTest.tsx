"use client";

import { useEffect, useState } from 'react';

export default function SimpleWebSocketTest() {
  const [btcPrice, setBtcPrice] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  useEffect(() => {
    // Direct connection to BTCUSDT ticker stream (24hr ticker statistics)
    const tickerWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    tickerWs.onopen = () => {
      console.log('✅ Ticker WebSocket connected');
      setConnectionStatus('Connected to ticker stream');
    };

    tickerWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📊 Ticker data received:', data);
        
        if (data.e === '24hrTicker') {
          setBtcPrice(data.c); // Current close price
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('❌ Error parsing ticker:', error);
      }
    };

    tickerWs.onclose = () => {
      console.log('❌ Ticker WebSocket closed');
      setConnectionStatus('Disconnected');
    };

    tickerWs.onerror = (error) => {
      console.error('❌ Ticker WebSocket error:', error);
      setConnectionStatus('Error');
    };

    return () => {
      tickerWs.close();
    };
  }, []);

  return (
    <div className="p-4 bg-blue-900 text-white rounded-lg mt-4">
      <h4 className="text-lg font-bold mb-3">🔍 Simple WebSocket Test</h4>
      <div className="space-y-2 text-sm">
        <p><strong>Status:</strong> <span className="text-yellow-300">{connectionStatus}</span></p>
        <p><strong>BTC Price:</strong> <span className="text-green-400">{btcPrice ? `$${parseFloat(btcPrice).toLocaleString()}` : 'Loading...'}</span></p>
        <p><strong>Last Update:</strong> <span className="text-gray-300">{lastUpdate || 'Never'}</span></p>
      </div>
    </div>
  );
}