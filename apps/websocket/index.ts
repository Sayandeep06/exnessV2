import WebSocket, { WebSocketServer } from 'ws';
import { CandleService, type Candle } from './CandleService';
import { engine } from '../engine/index';
import { createClient, type RedisClientType } from 'redis';

interface SubscriptionMessage {
    action: 'subscribe' | 'unsubscribe';
    symbol: string;
    interval?: string; 
    type?: 'candles' | 'positions' | 'orders'; 
}

interface ClientSubscription {
    ws: WebSocket;
    symbol: string;
    interval: string;
    type: 'candles' | 'positions' | 'orders';
    userId?: number; 
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

interface PositionUpdateResponse {
    type: 'position_update';
    data: {
        positionId: string;
        symbol: string;
        side: 'long' | 'short';
        margin: number;
        current_price: number;
        unrealized_pnl: number;
        roi_percentage: number;
        margin_ratio: number;
        status: string;
    };
}

interface PriceUpdateResponse {
    type: 'price_update';
    data: {
        symbol: string;
        bid: number;
        ask: number;
        mid: number;
        spread: number;
        timestamp: Date;
    };
}

interface LiquidationResponse {
    type: 'liquidation';
    data: {
        positionId: string;
        symbol: string;
        liquidation_price: number;
        margin_lost: number;
        reason: string;
    };
}


class WebSocketManager {
    private wss: WebSocketServer;
    private candleService: CandleService;
    private subscriptions: Map<string, ClientSubscription[]> = new Map();
    private intervalTimers: Map<string, NodeJS.Timeout> = new Map();
    private supportedIntervals = ['1m', '5m', '1h', '1d'];
    private redisClient: RedisClientType;
    private latestPrices: Map<string, any> = new Map();

    constructor(private port: number = 3492) {
        this.wss = new WebSocketServer({ port });
        this.candleService = new CandleService();
        this.redisClient = createClient();
        this.init();
    }

    private async init() {
        try {
            await this.redisClient.connect();
            console.log('WebSocket Redis client connected');
            
            this.setupWebSocketServer();
            this.startPeriodicCandleUpdates();
            this.startPricePoller();
            
            console.log(`WebSocket server running on port ${this.port}`);
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
        
        for (const [subscriptionKey, subs] of this.subscriptions.entries()) {
            const index = subs.findIndex(sub => sub.ws === ws);
            if (index !== -1) {
                subs.splice(index, 1);
                
                
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
        const type = message.type || 'candles';

        
        if (type === 'candles') {
            await this.handleCandleSubscription(ws, message, symbol, interval);
        } else if (type === 'positions' || type === 'orders') {
            await this.handleTradingSubscription(ws, message, symbol, type);
        } else {
            ws.send(JSON.stringify({ 
                error: `Unsupported subscription type: ${type}` 
            }));
        }
    }
    
    private async handleCandleSubscription(ws: WebSocket, message: SubscriptionMessage, symbol: string, interval: string) {
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
            
            if (!this.subscriptions.has(subscriptionKey)) {
                this.subscriptions.set(subscriptionKey, []);
            }
            
            const subscription: ClientSubscription = { ws, symbol, interval, type: 'candles' };
            this.subscriptions.get(subscriptionKey)!.push(subscription);

            
            if (!this.intervalTimers.has(subscriptionKey)) {
                this.startIntervalUpdates(symbol, interval);
            }

            ws.send(JSON.stringify({ 
                status: 'subscribed', 
                symbol: symbol.toUpperCase(),
                interval,
                type: 'candles'
            }));
            
            
            await this.sendRecentCandles(ws, symbol, interval);
            
        } else if (message.action === 'unsubscribe') {
            
            const subs = this.subscriptions.get(subscriptionKey);
            if (subs) {
                const index = subs.findIndex(sub => sub.ws === ws && sub.type === 'candles');
                if (index !== -1) {
                    subs.splice(index, 1);
                    
                    
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
                interval,
                type: 'candles'
            }));
        }
    }
    
    private async handleTradingSubscription(ws: WebSocket, message: SubscriptionMessage, symbol: string, type: 'positions' | 'orders') {
        
        const userId = (message as any).userId;
        if (!userId) {
            ws.send(JSON.stringify({ 
                error: 'userId is required for position/order subscriptions' 
            }));
            return;
        }
        
        const subscriptionKey = `trading_${type}_${userId}`;

        if (message.action === 'subscribe') {
            if (!this.subscriptions.has(subscriptionKey)) {
                this.subscriptions.set(subscriptionKey, []);
            }
            
            const subscription: ClientSubscription = { 
                ws, 
                symbol, 
                interval: '1s', 
                type, 
                userId: parseInt(userId) 
            };
            this.subscriptions.get(subscriptionKey)!.push(subscription);

            ws.send(JSON.stringify({ 
                status: 'subscribed', 
                type,
                userId
            }));
            
        } else if (message.action === 'unsubscribe') {
            const subs = this.subscriptions.get(subscriptionKey);
            if (subs) {
                const index = subs.findIndex(sub => sub.ws === ws && sub.type === type);
                if (index !== -1) {
                    subs.splice(index, 1);
                    
                    if (subs.length === 0) {
                        this.subscriptions.delete(subscriptionKey);
                    }
                }
            }

            ws.send(JSON.stringify({ 
                status: 'unsubscribed', 
                type,
                userId
            }));
        }
    }

    private startPeriodicCandleUpdates() {
        
        setInterval(async () => {
            for (const [subscriptionKey, subs] of this.subscriptions.entries()) {
                if (subs.length > 0) {
                    const parts = subscriptionKey.split('_');
                    if (parts.length === 2 && parts[0] && parts[1]) {
                        await this.broadcastLatestCandle(parts[0], parts[1]);
                    }
                }
            }
        }, 30000); 
        
        
        this.startTradingUpdates();
    }
    
    private startTradingUpdates() {
        setInterval(() => {
            // Broadcast position updates for subscribed users
            this.broadcastPositionUpdates();
        }, 1000); 
    }
    
    private startPricePoller() {
        // Continuously poll Redis for new price data from price poller
        const pollPrices = async () => {
            try {
                const priceMessage = await this.redisClient.rPop('prices');
                if (priceMessage) {
                    const tradeData = JSON.parse(priceMessage);
                    const spread = 100; // $100 spread
                    
                    const priceUpdate = {
                        symbol: tradeData.symbol,
                        price: tradeData.price,
                        bid: tradeData.price - spread/2,
                        ask: tradeData.price + spread/2,
                        spread: spread,
                        quantity: tradeData.quantity,
                        timestamp: tradeData.event_time
                    };
                    
                    // Store latest price
                    this.latestPrices.set(tradeData.symbol, priceUpdate);
                    
                    // Broadcast to WebSocket clients
                    this.broadcastPriceUpdate(priceUpdate);
                }
            } catch (error) {
                console.error('Error polling prices from Redis:', error);
            }
            
            // Poll every 100ms
            setTimeout(pollPrices, 100);
        };
        
        pollPrices();
    }

    private broadcastPriceUpdate(priceData: any) {
        const priceUpdate: PriceUpdateResponse = {
            type: 'price_update',
            data: {
                symbol: priceData.symbol,
                bid: priceData.bid,
                ask: priceData.ask,
                mid: priceData.price,
                spread: priceData.spread,
                timestamp: new Date(priceData.timestamp)
            }
        };
        
        this.broadcastToAllClients(priceUpdate);
    }
    
    
    private feedPricesToTradingEngine(candle: Candle, interval: string) {
        if (interval === '1m') { 
            const symbol = candle.symbol.toUpperCase();
            engine.updatePriceFromExternalSource(symbol, candle.close, 100); 
        }
    }
    
    private broadcastPositionUpdates() {
        
        for (const [subscriptionKey, subs] of this.subscriptions.entries()) {
            const candleSubs = subs.filter(sub => sub.type === 'positions');
            
            if (candleSubs.length > 0) {
                for (const sub of candleSubs) {
                    if (sub.userId) {
                        const positions = engine.getUserPositions(sub.userId);
                        const openPositions = positions.filter(pos => pos.status === 'open');
                        
                        for (const position of openPositions) {
                            const positionUpdate: PositionUpdateResponse = {
                                type: 'position_update',
                                data: {
                                    positionId: position.positionId,
                                    symbol: position.symbol,
                                    side: position.side,
                                    margin: position.margin,
                                    current_price: position.current_price,
                                    unrealized_pnl: position.unrealized_pnl,
                                    roi_percentage: position.roi_percentage,
                                    margin_ratio: position.margin_ratio,
                                    status: position.status
                                }
                            };
                            
                            if (sub.ws.readyState === WebSocket.OPEN) {
                                sub.ws.send(JSON.stringify(positionUpdate));
                            }
                        }
                    }
                }
            }
        }
    }
    
    private broadcastToAllClients(message: any) {
        const messageStr = JSON.stringify(message);
        
        for (const [_, subs] of this.subscriptions.entries()) {
            for (const sub of subs) {
                if (sub.ws.readyState === WebSocket.OPEN) {
                    sub.ws.send(messageStr);
                } else {
                    
                    this.cleanupClientSubscriptions(sub.ws);
                }
            }
        }
    }

    private startIntervalUpdates(symbol: string, interval: string) {
        const subscriptionKey = `${symbol}_${interval}`;
        
        
        let updateFrequency: number;
        switch (interval) {
            case '1m': updateFrequency = 15000; break;  
            case '5m': updateFrequency = 60000; break;  
            case '1h': updateFrequency = 300000; break; 
            case '1d': updateFrequency = 1800000; break; 
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
                .slice(-50) 
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
        const candleResponse: CandleResponse = {
            type: 'candle' as const,
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
        
        
        this.feedPricesToTradingEngine(candle, interval || candle.interval);
        
        return candleResponse;
    }


    private broadcastToSubscribers(subs: ClientSubscription[], message: CandleResponse) {
        const messageStr = JSON.stringify(message);
        
        subs.forEach((sub, index) => {
            if (sub.ws.readyState === WebSocket.OPEN) {
                sub.ws.send(messageStr);
            } else {
                
                subs.splice(index, 1);
            }
        });
    }

    public close() {
        
        this.intervalTimers.forEach(timer => clearInterval(timer));
        this.intervalTimers.clear();
        
        
        this.wss.close();
        
        console.log('WebSocket server closed');
    }
}

const wsManager = new WebSocketManager();

export { wsManager };