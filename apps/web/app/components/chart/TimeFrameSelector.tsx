"use client";

interface Props {
  selected: string;
  onChange: (timeframe: string) => void;
}

export default function TimeFrameSelector({ selected, onChange }: Props) {
  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' }
  ];

  return (
    <div className="flex items-center gap-1">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            selected === tf.value
              ? 'bg-yellow-500 text-black font-medium'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}