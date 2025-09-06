"use client";

import { useState, useEffect } from 'react';

interface Props {
  currentPrice: number;
  balance: {
    total: number;
    available: number;
    margin_used: number;
  };
  onBalanceUpdate: (balance: any) => void;
  onPositionUpdate: (positions: any[]) => void;
}

export default function TradingPanel({ 
  currentPrice, 
  balance, 
  onBalanceUpdate, 
  onPositionUpdate 
}: Props) {
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [margin, setMargin] = useState('100');
  const [leverage, setLeverage] = useState('10');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  
  
  const positionSize = parseFloat(margin) * parseInt(leverage);
  const quantity = positionSize / currentPrice;

  const handlePlaceOrder = async () => {
    if (!margin || !leverage) {
      setOrderMessage('Please enter margin and leverage');
      return;
    }

    if (parseFloat(margin) > balance.available) {
      setOrderMessage('Insufficient balance');
      return;
    }

    setIsPlacingOrder(true);
    setOrderMessage('');

    try {
      const response = await fetch('http://localhost:3000/api/v1/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token' 
        },
        body: JSON.stringify({
          asset: 'BTCUSDT',
          type: orderSide, 
          margin: parseFloat(margin),
          leverage: parseInt(leverage)
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setOrderMessage(`${orderSide.toUpperCase()} order placed successfully!`);
        
        
        const newBalance = {
          ...balance,
          available: balance.available - parseFloat(margin),
          margin_used: balance.margin_used + parseFloat(margin)
        };
        onBalanceUpdate(newBalance);
        
        
        await fetchPositions();
        
        
        setMargin('100');
        setLeverage('10');
      } else {
        setOrderMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      setOrderMessage('Failed to place order. Check connection.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/trades/open', {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        onPositionUpdate(result.trades);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  
  useEffect(() => {
    fetchPositions();
  }, []);

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Trade BTC/USD</h3>
      
      
      <div className="flex rounded-lg bg-gray-700 p-1 mb-4">
        <button
          onClick={() => setOrderSide('buy')}
          className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
            orderSide === 'buy' 
              ? 'bg-green-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setOrderSide('sell')}
          className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
            orderSide === 'sell' 
              ? 'bg-red-600 text-white' 
              : 'text-gray-300 hover:text-white'
          }`}
        >
          SELL
        </button>
      </div>

      
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="text-xs text-gray-400 mb-1">Current Price</div>
        <div className="text-lg font-mono text-white">
          ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">
          Margin (USD)
        </label>
        <input
          type="number"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
          placeholder="Enter margin amount"
        />
        <div className="text-xs text-gray-400 mt-1">
          Available: ${balance.available.toLocaleString()}
        </div>
      </div>

      
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">
          Leverage
        </label>
        <select
          value={leverage}
          onChange={(e) => setLeverage(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-500"
        >
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
          <option value="20">20x</option>
          <option value="50">50x</option>
          <option value="100">100x</option>
        </select>
      </div>

      
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Position Size:</span>
          <span className="text-white">${positionSize.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Quantity:</span>
          <span className="text-white">{quantity.toFixed(8)} BTC</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Entry Price:</span>
          <span className="text-white">${currentPrice.toLocaleString()}</span>
        </div>
      </div>

      
      <button
        onClick={handlePlaceOrder}
        disabled={isPlacingOrder || !margin || !leverage}
        className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
          orderSide === 'buy'
            ? 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
            : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
        } disabled:cursor-not-allowed`}
      >
        {isPlacingOrder ? 'Placing Order...' : `${orderSide.toUpperCase()} BTC/USD`}
      </button>

      
      {orderMessage && (
        <div className={`mt-3 p-2 rounded text-sm text-center ${
          orderMessage.includes('Error') || orderMessage.includes('Failed')
            ? 'bg-red-600/20 text-red-400 border border-red-600'
            : orderMessage.includes('successfully')
            ? 'bg-green-600/20 text-green-400 border border-green-600'
            : 'bg-yellow-600/20 text-yellow-400 border border-yellow-600'
        }`}>
          {orderMessage}
        </div>
      )}

      
      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white">${balance.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Available:</span>
            <span className="text-green-400">${balance.available.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin Used:</span>
            <span className="text-red-400">${balance.margin_used.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}