"use client";

import TradingViewChart from "./chart/TradingViewChart";
import BTCMarketData from "./trading/BTCMarketData";
import OrderPanel from "./trading/OrderPanel";
import InstrumentsPanel from "./trading/InstrumentsPanel";
import TestConnection from "./TestConnection";
import SimpleWebSocketTest from "./SimpleWebSocketTest";

export default function TradingInterface() {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      {/* Top Header */}
      <header className="flex justify-between items-center px-5 py-3 bg-gray-800 border-b border-gray-700 min-h-[60px]">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-semibold text-yellow-500 m-0">exness</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">🇺🇸</span>
              <span className="text-gray-300">XAU/USD</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500 rounded text-sm font-medium">
              <span>₿</span>
              <span>BTC</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">🇯🇵</span>
              <span className="text-gray-300">USD/JPY</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">🇪🇺</span>
              <span className="text-gray-300">EUR/USD</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <BTCMarketData />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-400">Demo</span>
            <span className="text-white">9,997.21 USD</span>
            <button className="text-gray-400 hover:text-white">⚙️</button>
            <button className="text-gray-400 hover:text-white">⏰</button>
            <button className="text-gray-400 hover:text-white">📊</button>
            <button className="text-gray-400 hover:text-white">👤</button>
            <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
              Deposit
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Instruments Panel */}
        <div className="w-80 border-r border-gray-700">
          <InstrumentsPanel />
        </div>

        {/* Center Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-medium">Bitcoin vs US Dollar • 1 •</h3>
                <BTCMarketData showDetails={false} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button className="text-gray-400 hover:text-white px-2 py-1">1m</button>
                <button className="text-gray-400 hover:text-white px-2 py-1">5m</button>
                <button className="text-gray-400 hover:text-white px-2 py-1">15m</button>
                <button className="text-gray-400 hover:text-white px-2 py-1">1h</button>
                <button className="text-gray-400 hover:text-white px-2 py-1">4h</button>
                <button className="text-gray-400 hover:text-white px-2 py-1">1d</button>
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="flex-1 bg-gray-900">
            <TradingViewChart />
          </div>
        </div>

        {/* Right Trading Panel */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <OrderPanel />
          <div className="p-4">
            <SimpleWebSocketTest />
            <TestConnection />
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="h-48 bg-gray-800 border-t border-gray-700">
        <div className="flex border-b border-gray-700">
          <button className="px-4 py-3 bg-transparent border-none text-yellow-500 text-sm border-b-2 border-yellow-500 font-medium">
            Open
          </button>
          <button className="px-4 py-3 bg-transparent border-none text-gray-400 text-sm border-b-2 border-transparent hover:text-white transition-all duration-200">
            Pending
          </button>
          <button className="px-4 py-3 bg-transparent border-none text-gray-400 text-sm border-b-2 border-transparent hover:text-white transition-all duration-200">
            Closed
          </button>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">💼</div>
              <div className="text-sm">No open positions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>Equity: 9,997.21 USD</span>
          <span>Free Margin: 9,997.21 USD</span>
          <span>Balance: 9,997.21 USD</span>
          <span>Margin: 0.00 USD</span>
          <span>Margin level: —</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}