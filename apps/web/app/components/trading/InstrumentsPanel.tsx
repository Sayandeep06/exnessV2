"use client";

import { useState } from 'react';

interface Instrument {
  symbol: string;
  name: string;
  price: string;
  bid: string;
  ask: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

export default function InstrumentsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Favorites');

  // Mock data - in real app this would come from WebSocket
  const instruments: Instrument[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: '113,060.14',
      bid: '113,060.14',
      ask: '113,081.74',
      change: '-88.71',
      changePercent: '-0.08%',
      isPositive: false
    },
    {
      symbol: 'XAU/USD',
      name: 'Gold',
      price: '3,411.170',
      bid: '3,411.170',
      ask: '3,411.330',
      change: '15.42',
      changePercent: '0.45%',
      isPositive: true
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc',
      price: '230.67',
      bid: '230.67',
      ask: '230.80',
      change: '2.34',
      changePercent: '1.02%',
      isPositive: true
    },
    {
      symbol: 'EUR/USD',
      name: 'Euro/US Dollar',
      price: '1.16835',
      bid: '1.16835',
      ask: '1.16844',
      change: '-0.00123',
      changePercent: '-0.11%',
      isPositive: false
    },
    {
      symbol: 'GBP/USD',
      name: 'British Pound/US Dollar',
      price: '1.35215',
      bid: '1.35215',
      ask: '1.35226',
      change: '0.00234',
      changePercent: '0.17%',
      isPositive: true
    }
  ];

  const filteredInstruments = instruments.filter(instrument =>
    instrument.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instrument.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-800 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">INSTRUMENTS</h2>
          <button className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="px-4 py-2 border-b border-gray-700">
        <button
          className={`px-3 py-1 text-sm rounded ${
            selectedCategory === 'Favorites' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setSelectedCategory('Favorites')}
        >
          Favorites
        </button>
      </div>

      {/* Table Header */}
      <div className="px-4 py-2 border-b border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-medium">
          <span>Symbol</span>
          <span>Signal</span>
          <span>Bid</span>
          <span>Ask</span>
        </div>
      </div>

      {/* Instruments List */}
      <div className="flex-1 overflow-y-auto">
        {filteredInstruments.map((instrument) => (
          <div
            key={instrument.symbol}
            className="px-4 py-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50"
          >
            <div className="grid grid-cols-4 gap-2 items-center">
              {/* Symbol */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                  {instrument.symbol === 'BTC' && '₿'}
                  {instrument.symbol === 'XAU/USD' && '🥇'}
                  {instrument.symbol === 'AAPL' && '🍎'}
                  {instrument.symbol === 'EUR/USD' && '🇪🇺'}
                  {instrument.symbol === 'GBP/USD' && '🇬🇧'}
                </div>
                <div>
                  <div className="text-white text-xs font-medium">{instrument.symbol}</div>
                </div>
              </div>

              {/* Signal */}
              <div>
                <span className={`text-xs px-2 py-1 rounded ${
                  instrument.isPositive ? 'bg-green-600' : 'bg-red-600'
                } text-white`}>
                  {instrument.isPositive ? 'B' : 'S'}
                </span>
              </div>

              {/* Bid */}
              <div className={`text-xs font-mono ${
                instrument.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {instrument.bid}
              </div>

              {/* Ask */}
              <div className={`text-xs font-mono ${
                instrument.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {instrument.ask}
              </div>
            </div>

            {/* Change indicator */}
            <div className="mt-1 flex justify-end">
              <span className={`text-xs ${
                instrument.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {instrument.isPositive ? '↑' : '↓'} {instrument.changePercent}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}