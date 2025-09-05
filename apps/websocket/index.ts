import WebSocket, { WebSocketServer } from 'ws';
import { CandleService, type Candle } from './CandleService';

interface SubscriptionMessage {
    action: 'subscribe' | 'unsubscribe';
    symbol: string;
    interval?: string; // '1m', '5m', '1h', '1d'
}

interface ClientSubscription {
    ws: WebSocket;
    symbol: string;
    interval: string;
}

interface CandleResponse {
    type: 'candle';
    data: {
        symbol: string;
        interval: string;
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        tradeCount: number;
    };
}


class WebSocketManager {
    private wss: WebSocketServer;
    private candleService: CandleService;
    private subscriptions: Map<string, ClientSubscription[]> = new Map();
    private intervalTimers: Map<string, NodeJS.Timeout> = new Map();
    private supportedIntervals = ['1m', '5m', '1h', '1d'];

    constructor(port: number = 8080) {
        this.wss = new WebSocketServer({ port });
        this.candleService = new CandleService();
        this.init();
    }

    private async init() {
        try {
            this.setupWebSocketServer();
            this.startPeriodicCandleUpdates();
            
            console.log(`WebSocket server running on port 8080`);
        } catch (error) {
            console.error('Failed to initialize WebSocket server:', error);
        }
    }

    private setupWebSocketServer() {
        this.wss.on('connection', (ws: WebSocket) => {
            console.log('New client connected');

            ws.on('message', (data: Buffer) => {
                try {
                    const message: SubscriptionMessage = JSON.parse(data.toString());
                    this.handleSubscription(ws, message);
                } catch (error) {
                    console.error('Invalid message format:', error);
                    ws.send(JSON.stringify({ error: 'Invalid message format' }));
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
                this.cleanupClientSubscriptions(ws);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.cleanupClientSubscriptions(ws);
            });
        });
    }

    private cleanupClientSubscriptions(ws: WebSocket) {
        // Remove this client from all subscriptions
        for (const [subscriptionKey, subs] of this.subscriptions.entries()) {
            const index = subs.findIndex(sub => sub.ws === ws);
            if (index !== -1) {
                subs.splice(index, 1);
                
                // Clean up empty subscriptions
                if (subs.length === 0) {
                    this.subscriptions.delete(subscriptionKey);
                    const timer = this.intervalTimers.get(subscriptionKey);
                    if (timer) {
                        clearInterval(timer);
                        this.intervalTimers.delete(subscriptionKey);
                    }
                }
            }
        }
    }

    private async handleSubscription(ws: WebSocket, message: SubscriptionMessage) {
        const symbol = message.symbol.toLowerCase();
        const interval = message.interval || '1m';

        if (symbol !== 'btcusdt') {
            ws.send(JSON.stringify({ 
                error: 'Only BTCUSDT is supported currently' 
            }));
            return;
        }

        if (!this.supportedIntervals.includes(interval)) {
            ws.send(JSON.stringify({ 
                error: `Unsupported interval. Supported: ${this.supportedIntervals.join(', ')}` 
            }));
            return;
        }

        const subscriptionKey = `${symbol}_${interval}`;

        if (message.action === 'subscribe') {
            // Add subscription
            if (!this.subscriptions.has(subscriptionKey)) {
                this.subscriptions.set(subscriptionKey, []);
            }
            
            const subscription: ClientSubscription = { ws, symbol, interval };
            this.subscriptions.get(subscriptionKey)!.push(subscription);

            // Start interval timer if not exists
            if (!this.intervalTimers.has(subscriptionKey)) {
                this.startIntervalUpdates(symbol, interval);
            }

            ws.send(JSON.stringify({ 
                status: 'subscribed', 
                symbol: symbol.toUpperCase(),
                interval 
            }));
            
            // Send recent candles immediately
            await this.sendRecentCandles(ws, symbol, interval);
            
        } else if (message.action === 'unsubscribe') {
            // Remove subscription
            const subs = this.subscriptions.get(subscriptionKey);
            if (subs) {
                const index = subs.findIndex(sub => sub.ws === ws);
                if (index !== -1) {
                    subs.splice(index, 1);
                    
                    // Clean up if no more subscribers
                    if (subs.length === 0) {
                        this.subscriptions.delete(subscriptionKey);
                        const timer = this.intervalTimers.get(subscriptionKey);
                        if (timer) {
                            clearInterval(timer);
                            this.intervalTimers.delete(subscriptionKey);
                        }
                    }
                }
            }

            ws.send(JSON.stringify({ 
                status: 'unsubscribed', 
                symbol: symbol.toUpperCase(),
                interval
            }));
        }
    }

    private startPeriodicCandleUpdates() {
        // Update all active subscriptions every 30 seconds
        setInterval(async () => {
            for (const [subscriptionKey, subs] of this.subscriptions.entries()) {
                if (subs.length > 0) {
                    const parts = subscriptionKey.split('_');
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        await this.broadcastLatestCandle(parts[0], parts[1]);
                    }
                }
            }
        }, 30000); // 30 seconds
    }

    private startIntervalUpdates(symbol: string, interval: string) {
        const subscriptionKey = `${symbol}_${interval}`;
        
        // Set different update frequencies based on interval
        let updateFrequency: number;
        switch (interval) {
            case '1m': updateFrequency = 15000; break;  // 15 seconds
            case '5m': updateFrequency = 60000; break;  // 1 minute  
            case '1h': updateFrequency = 300000; break; // 5 minutes
            case '1d': updateFrequency = 1800000; break; // 30 minutes
            default: updateFrequency = 30000;
        }

        const timer = setInterval(async () => {
            await this.broadcastLatestCandle(symbol, interval);
        }, updateFrequency);

        this.intervalTimers.set(subscriptionKey, timer);
    }

    private async sendRecentCandles(ws: WebSocket, symbol: string, interval: string) {
        try {
            const candles = await this.candleService.getRecentCandles(interval, 100);
            const recentCandles = candles
                .filter(c => c.symbol.toLowerCase() === symbol)
                .slice(-50) // Send last 50 candles
                .map(candle => this.formatCandle(candle, interval));

            for (const candle of recentCandles) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(candle));
                }
            }
        } catch (error) {
            console.error('Error sending recent candles:', error);
        }
    }

    private async broadcastLatestCandle(symbol: string, interval: string) {
        const subscriptionKey = `${symbol}_${interval}`;
        const subs = this.subscriptions.get(subscriptionKey);
        
        if (!subs || subs.length === 0) return;

        try {
            const candles = await this.candleService.getRecentCandles(interval, 1);
            const latestCandle = candles.find(c => c.symbol.toLowerCase() === symbol);
            
            if (latestCandle) {
                const candleResponse = this.formatCandle(latestCandle, interval);
                this.broadcastToSubscribers(subs, candleResponse);
            }
        } catch (error) {
            console.error(`Error broadcasting ${interval} candle:`, error);
        }
    }

    private formatCandle(candle: Candle, interval?: string): CandleResponse {
        return {
            type: 'candle',
            data: {
                symbol: candle.symbol.toUpperCase(),
                interval: interval || candle.interval,
                timestamp: Math.floor(candle.bucket.getTime() / 1000),
                open: candle.open,
                high: candle.high, 
                low: candle.low,
                close: candle.close,
                volume: candle.volume,
                tradeCount: candle.trade_count
            }
        };
    }


    private broadcastToSubscribers(subs: ClientSubscription[], message: CandleResponse) {
        const messageStr = JSON.stringify(message);
        
        subs.forEach((sub, index) => {
            if (sub.ws.readyState === WebSocket.OPEN) {
                sub.ws.send(messageStr);
            } else {
                // Remove dead connections
                subs.splice(index, 1);
            }
        });
    }

    public close() {
        // Clear all timers
        this.intervalTimers.forEach(timer => clearInterval(timer));
        this.intervalTimers.clear();
        
        // Close WebSocket server
        this.wss.close();
        
        console.log('WebSocket server closed');
    }
}

const wsManager = new WebSocketManager();

export { wsManager };
