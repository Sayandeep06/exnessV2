"use client";

import { useEffect, useState } from 'react';

interface Props {
  price: number;
  onChange: number;
  showDetails?: boolean;
  onPriceUpdate?: (price: number) => void;
}

export default function PriceDisplay({ 
  price, 
  onChange, 
  showDetails = true,
  onPriceUpdate 
}: Props) {
  const [prevPrice, setPrevPrice] = useState(price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [displayPrice, setDisplayPrice] = useState(price);

  useEffect(() => {
    if (price !== prevPrice) {
      setPriceDirection(price > prevPrice ? 'up' : 'down');
      setPrevPrice(price);
      setDisplayPrice(price);
      
      if (onPriceUpdate) {
        onPriceUpdate(price);
      }

      
      const timer = setTimeout(() => {
        setPriceDirection('neutral');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [price, prevPrice, onPriceUpdate]);

  const isPositive = onChange >= 0;
  const formattedPrice = displayPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formattedChange = `${isPositive ? '+' : ''}${onChange.toFixed(2)}%`;

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <span 
          className={`text-lg font-mono transition-colors duration-300 ${
            priceDirection === 'up' ? 'text-green-400' : 
            priceDirection === 'down' ? 'text-red-400' : 'text-white'
          }`}
        >
          ${formattedPrice}
        </span>
        <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formattedChange}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span 
          className={`text-xl font-mono font-bold transition-colors duration-300 ${
            priceDirection === 'up' ? 'text-green-400' : 
            priceDirection === 'down' ? 'text-red-400' : 'text-white'
          }`}
        >
          ${formattedPrice}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formattedChange}
          </span>
          <span className="text-xs text-gray-400">24h</span>
        </div>
      </div>
      <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${
        priceDirection === 'up' ? 'bg-green-400' : 
        priceDirection === 'down' ? 'bg-red-400' : 'bg-gray-600'
      }`}></div>
    </div>
  );
}