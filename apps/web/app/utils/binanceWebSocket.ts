import { KlineData, TickerData } from '../types/trading';

export class BinanceWebSocketManager {
  private ws: WebSocket | null = null;
  private baseUrl = 'wss://stream.binance.com:9443/ws';
  private combinedStreamUrl = 'wss://stream.binance.com:9443/stream';
  private callbacks: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private streams: Set<string> = new Set();

  constructor() {
    this.connectToCombinedStream();
  }

  private connectToCombinedStream() {
    try {
      // Start with base URL for combined streams
      let url = this.combinedStreamUrl;
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Binance WebSocket connected to:', url);
        this.reconnectAttempts = 0;
        
        // Subscribe to streams after connection opens
        if (this.streams.size > 0) {
          setTimeout(() => {
            this.subscribeToStreams();
          }, 100); // Small delay to ensure connection is fully established
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Raw WebSocket message:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('Binance WebSocket disconnected', event.code, event.reason);
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connectToCombinedStream();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private subscribeToStreams() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.streams.size > 0) {
      this.sendMessage({
        method: 'SUBSCRIBE',
        params: Array.from(this.streams),
        id: Date.now()
      });
    }
  }

  private handleMessage(data: any) {
    // Handle different message types
    if (data.stream) {
      // Combined stream format
      const callback = this.callbacks.get(data.stream);
      if (callback) {
        callback(data.data);
      }
    } else if (data.e === 'kline') {
      // Direct kline event
      const stream = `${data.s.toLowerCase()}@kline_${data.k.i}`;
      const callback = this.callbacks.get(stream);
      if (callback) {
        callback(data);
      }
    } else if (data.e === '24hrTicker') {
      // Direct ticker event
      const stream = `${data.s.toLowerCase()}@ticker`;
      const callback = this.callbacks.get(stream);
      if (callback) {
        callback(data);
      }
    }
  }

  private sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('Sent message:', message);
    } else {
      console.warn('WebSocket not ready, message not sent:', message);
    }
  }

  subscribeToKline(symbol: string, interval: string, callback: (data: KlineData) => void) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    this.streams.add(stream);
    
    this.callbacks.set(stream, (data: any) => {
      // Handle the kline data according to Binance API format
      const klineInfo = data.k || data; // Handle both combined stream and direct format
      const klineData: KlineData = {
        symbol: klineInfo.s,
        openTime: klineInfo.t,
        closeTime: klineInfo.T,
        open: klineInfo.o,
        high: klineInfo.h,
        low: klineInfo.l,
        close: klineInfo.c,
        volume: klineInfo.v,
        interval: klineInfo.i
      };
      callback(klineData);
    });

    // If WebSocket is already connected, subscribe immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now()
      });
    } else {
      // Reconnect with new streams
      this.connectToCombinedStream();
    }
  }

  subscribeToTicker(symbol: string, callback: (data: TickerData) => void) {
    const stream = `${symbol.toLowerCase()}@ticker`;
    this.streams.add(stream);
    
    this.callbacks.set(stream, (data: any) => {
      const tickerData: TickerData = {
        symbol: data.s,
        price: data.c,
        priceChange: data.p,
        priceChangePercent: data.P,
        highPrice: data.h,
        lowPrice: data.l,
        volume: data.v
      };
      callback(tickerData);
    });

    // If WebSocket is already connected, subscribe immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now()
      });
    } else {
      // Reconnect with new streams
      this.connectToCombinedStream();
    }
  }

  unsubscribe(symbol: string, type: 'kline' | 'ticker', interval?: string) {
    let stream: string;
    if (type === 'kline' && interval) {
      stream = `${symbol.toLowerCase()}@kline_${interval}`;
    } else if (type === 'ticker') {
      stream = `${symbol.toLowerCase()}@ticker`;
    } else {
      return;
    }

    this.streams.delete(stream);
    this.callbacks.delete(stream);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendMessage({
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: Date.now()
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.streams.clear();
    this.callbacks.clear();
  }
}

export const binanceWS = new BinanceWebSocketManager();