"use client";

import { useState, useEffect } from 'react';

interface Position {
  positionId: string;
  symbol: string;
  side: 'long' | 'short';
  margin: number;
  leverage: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  roi_percentage: number;
  position_size: number;
  quantity: number;
  status: string;
  opened_at: string;
}

interface Props {
  positions: Position[];
  onPositionsUpdate: (positions: Position[]) => void;
}

export default function PositionsPanel({ positions, onPositionsUpdate }: Props) {
  const [activeTab, setActiveTab] = useState<'open' | 'pending' | 'closed'>('open');
  const [isClosingPosition, setIsClosingPosition] = useState<string | null>(null);

  const openPositions = positions.filter(pos => pos.status === 'open');
  const closedPositions = positions.filter(pos => pos.status === 'closed' || pos.status === 'liquidated');

  const handleClosePosition = async (positionId: string) => {
    setIsClosingPosition(positionId);

    try {
      const response = await fetch(`http://localhost:3000/api/v1/trading/positions/${positionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 1
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        
        await fetchPositions();
      } else {
        console.error('Error closing position:', result.error);
      }
    } catch (error) {
      console.error('Error closing position:', error);
    } finally {
      setIsClosingPosition(null);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/trading/positions/1');
      const result = await response.json();
      
      if (result.success) {
        onPositionsUpdate(result.data);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  
  useEffect(() => {
    const interval = setInterval(fetchPositions, 3000); 
    return () => clearInterval(interval);
  }, []);

  const renderPositionRow = (position: Position) => {
    const isLong = position.side === 'long';
    const isProfitable = position.unrealized_pnl >= 0;

    return (
      <tr key={position.positionId} className="border-b border-gray-700 hover:bg-gray-800/50">
        <td className="px-3 py-2 text-sm">{position.symbol}</td>
        <td className="px-3 py-2 text-sm">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isLong ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
          }`}>
            {position.side.toUpperCase()}
          </span>
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          ${position.entry_price.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          ${position.current_price.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-sm">
          {position.leverage}x
        </td>
        <td className="px-3 py-2 text-sm">
          ${position.margin.toLocaleString()}
        </td>
        <td className="px-3 py-2 text-sm font-mono">
          {position.quantity.toFixed(6)}
        </td>
        <td className={`px-3 py-2 text-sm font-medium ${
          isProfitable ? 'text-green-400' : 'text-red-400'
        }`}>
          {isProfitable ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
        </td>
        <td className={`px-3 py-2 text-sm font-medium ${
          isProfitable ? 'text-green-400' : 'text-red-400'
        }`}>
          {isProfitable ? '+' : ''}{position.roi_percentage.toFixed(2)}%
        </td>
        <td className="px-3 py-2 text-sm">
          {position.status === 'open' ? (
            <button
              onClick={() => handleClosePosition(position.positionId)}
              disabled={isClosingPosition === position.positionId}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded disabled:cursor-not-allowed"
            >
              {isClosingPosition === position.positionId ? 'Closing...' : 'Close'}
            </button>
          ) : (
            <span className={`px-2 py-1 rounded text-xs ${
              position.status === 'liquidated' 
                ? 'bg-red-600/20 text-red-400'
                : 'bg-gray-600/20 text-gray-400'
            }`}>
              {position.status}
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col">
      
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('open')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'open'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Open ({openPositions.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Pending (0)
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'closed'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Closed ({closedPositions.length})
        </button>
      </div>

      
      <div className="flex-1 overflow-auto">
        {activeTab === 'open' && openPositions.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💼</div>
              <div className="text-sm">No open positions</div>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">⏳</div>
              <div className="text-sm">No pending orders</div>
            </div>
          </div>
        )}

        {activeTab === 'closed' && closedPositions.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-sm">No closed positions</div>
            </div>
          </div>
        )}

        {((activeTab === 'open' && openPositions.length > 0) || 
          (activeTab === 'closed' && closedPositions.length > 0)) && (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Entry</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Current</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Leverage</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Margin</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">P&L</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">ROI</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'open' && openPositions.map(renderPositionRow)}
              {activeTab === 'closed' && closedPositions.map(renderPositionRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}