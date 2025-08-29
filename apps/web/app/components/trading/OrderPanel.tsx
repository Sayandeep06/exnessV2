"use client";

import { useState } from 'react';
import { useTickerData } from '../../hooks/useBinanceData';

export default function OrderPanel() {
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [volume, setVolume] = useState('0.001');
  const [orderMode, setOrderMode] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  
  const { tickerData } = useTickerData('BTCUSDT');
  const currentPrice = tickerData ? parseFloat(tickerData.price) : 0;

  const handlePlaceOrder = () => {
    console.log('Placing order:', {
      type: orderType,
      volume: parseFloat(volume),
      mode: orderMode,
      price: orderMode === 'LIMIT' ? parseFloat(limitPrice) : currentPrice,
      symbol: 'BTCUSDT'
    });
    
    alert(`${orderType} order for ${volume} BTC would be placed at ${orderMode === 'LIMIT' ? `$${limitPrice}` : 'market price'}`);
  };

  const calculateNotional = () => {
    const vol = parseFloat(volume) || 0;
    const price = orderMode === 'LIMIT' ? parseFloat(limitPrice) || 0 : currentPrice;
    return (vol * price).toFixed(2);
  };

  return (
    <div className="p-5 bg-gray-800 h-full overflow-y-auto">
      <h3 className="text-base text-white m-0 mb-5 border-b border-gray-700 pb-2.5">Place Order - BTC/USDT</h3>
      
      <div className="flex mb-5 rounded-md overflow-hidden border border-gray-600">
        <button 
          className={`flex-1 p-3 bg-gray-700 border-none text-gray-400 cursor-pointer text-sm font-semibold transition-all duration-200 hover:bg-gray-600 ${
            orderType === 'BUY' ? 'bg-emerald-500 text-white' : ''
          }`}
          onClick={() => setOrderType('BUY')}
        >
          BUY
        </button>
        <button 
          className={`flex-1 p-3 bg-gray-700 border-none text-gray-400 cursor-pointer text-sm font-semibold transition-all duration-200 hover:bg-gray-600 ${
            orderType === 'SELL' ? 'bg-red-500 text-white' : ''
          }`}
          onClick={() => setOrderType('SELL')}
        >
          SELL
        </button>
      </div>

      <div className="flex mb-5 gap-2">
        <button 
          className={`flex-1 p-2.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 ${
            orderMode === 'MARKET' ? 'bg-yellow-500 text-black border-yellow-500' : ''
          }`}
          onClick={() => setOrderMode('MARKET')}
        >
          Market
        </button>
        <button 
          className={`flex-1 p-2.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 ${
            orderMode === 'LIMIT' ? 'bg-yellow-500 text-black border-yellow-500' : ''
          }`}
          onClick={() => setOrderMode('LIMIT')}
        >
          Limit
        </button>
      </div>

      <div className="mb-4">
        <label className="block mb-1.5 text-xs text-gray-400 font-medium">Volume (BTC)</label>
        <input
          type="number"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          step="0.001"
          min="0.001"
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white text-sm transition-all duration-200 focus:outline-none focus:border-yellow-500 focus:bg-gray-600"
        />
      </div>

      {orderMode === 'LIMIT' && (
        <div className="mb-4">
          <label className="block mb-1.5 text-xs text-gray-400 font-medium">Limit Price (USDT)</label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            step="0.01"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white text-sm transition-all duration-200 focus:outline-none focus:border-yellow-500 focus:bg-gray-600"
            placeholder={currentPrice.toFixed(2)}
          />
        </div>
      )}

      <div className="bg-gray-700 rounded-md p-4 mb-5 border border-gray-600">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-gray-400">Current Price:</span>
          <span className="text-white font-medium">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Notional Value:</span>
          <span className="text-white font-medium">${calculateNotional()}</span>
        </div>
      </div>

      <button 
        className={`w-full p-3.5 border-none rounded-md text-base font-semibold cursor-pointer transition-all duration-200 mb-5 ${
          orderType === 'BUY' 
            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
            : 'bg-red-500 text-white hover:bg-red-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={handlePlaceOrder}
        disabled={!volume || (orderMode === 'LIMIT' && !limitPrice)}
      >
        {orderType} {volume} BTC
      </button>

      <div className="border-t border-gray-700 pt-4">
        <span className="block mb-2 text-xs text-gray-400">Quick amounts:</span>
        <div className="flex gap-1.5">
          <button 
            className="flex-1 py-2 px-1.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 hover:text-white"
            onClick={() => setVolume('0.001')}
          >
            0.001
          </button>
          <button 
            className="flex-1 py-2 px-1.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 hover:text-white"
            onClick={() => setVolume('0.01')}
          >
            0.01
          </button>
          <button 
            className="flex-1 py-2 px-1.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 hover:text-white"
            onClick={() => setVolume('0.1')}
          >
            0.1
          </button>
          <button 
            className="flex-1 py-2 px-1.5 bg-gray-700 border border-gray-600 text-gray-400 cursor-pointer text-xs rounded transition-all duration-200 hover:bg-gray-600 hover:text-white"
            onClick={() => setVolume('1')}
          >
            1
          </button>
        </div>
      </div>
    </div>
  );
}