"use client";

import { useState, useEffect } from 'react';
import TradingViewChart from './chart/TradingViewChart';
import TradingPanel from './trading/TradingPanel';
import PositionsPanel from './trading/PositionsPanel';
import PriceDisplay from './trading/PriceDisplay';
import TimeFrameSelector from './chart/TimeFrameSelector';

export default function TradingInterface() {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState('5m');
  const [positions, setPositions] = useState<any[]>([]);
  const [balance, setBalance] = useState({ total: 10000, available: 9000, margin_used: 1000 });
  const [wsConnected, setWsConnected] = useState(false);

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      
      <header className="flex justify-between items-center px-4 py-2 bg-gray-800 border-b border-gray-700 h-14">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-yellow-500">exness</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500 rounded">
              <span>₿</span>
              <span>BTC/USD</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <PriceDisplay 
            price={currentPrice} 
            onChange={24.5}
            onPriceUpdate={setCurrentPrice}
          />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-400">Demo</span>
            <span className="text-white">${balance.total.toLocaleString()}</span>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs">{wsConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      
      <div className="flex h-[calc(100vh-3.5rem)]">
        
        <div className="flex-1 flex flex-col">
          
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 h-12">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-medium">Bitcoin vs US Dollar</h3>
                <PriceDisplay 
                  price={currentPrice} 
                  onChange={24.5} 
                  showDetails={false}
                  onPriceUpdate={setCurrentPrice}
                />
              </div>
              <TimeFrameSelector 
                selected={selectedTimeframe}
                onChange={setSelectedTimeframe}
              />
            </div>
          </div>
          
          
          <div className="flex-1 bg-gray-900">
            <TradingViewChart 
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
              onPriceUpdate={setCurrentPrice}
              onConnectionChange={setWsConnected}
            />
          </div>
        </div>

        
        <div className="w-80 border-l border-gray-700 flex flex-col bg-gray-800">
          <TradingPanel 
            currentPrice={currentPrice}
            balance={balance}
            onBalanceUpdate={setBalance}
            onPositionUpdate={setPositions}
          />
        </div>
      </div>

      
      <div className="h-48 bg-gray-800 border-t border-gray-700">
        <PositionsPanel 
          positions={positions}
          onPositionsUpdate={setPositions}
        />
      </div>

      
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 text-xs text-gray-400 h-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Equity: ${(balance.total + positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0)).toLocaleString()}</span>
          <span>Free Margin: ${balance.available.toLocaleString()}</span>
          <span>Balance: ${balance.total.toLocaleString()}</span>
          <span>Margin: ${balance.margin_used.toLocaleString()}</span>
          <span>Margin level: {balance.margin_used > 0 ? ((balance.total / balance.margin_used) * 100).toFixed(0) + '%' : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}