import type { User, Order, Position, MarketPrice, TradingEngineConfig, LiquidationEvent } from './types';
import { v4 as uuidv4 } from 'uuid';

export class TradingEngine {
    private static instance: TradingEngine | null = null;
    
    private users: Map<number, User> = new Map();
    private positions: Map<string, Position> = new Map();
    private orders: Map<string, Order> = new Map();
    private prices: Map<string, MarketPrice> = new Map();
    private liquidations: LiquidationEvent[] = [];
    private config: TradingEngineConfig;
    
    private constructor() {
        this.config = {
            max_leverage: { 
                'BTCUSDT': 100, 
                'ETHUSDT': 50,
                'btc': 100  
            },
            margin_call_ratio: 0.1,    
            liquidation_fee: 0.005,          
            max_position_size: 100000, 
            max_positions_per_user: 10,
            liquidation_buffer: 0.001  
        };
        
        this.loadInitialData();
        this.startPriceMonitoring();
    }
    
    public static getInstance(): TradingEngine {
        if (!TradingEngine.instance) {
            TradingEngine.instance = new TradingEngine();
        }
        return TradingEngine.instance;
    }
    
    private loadInitialData(): void {
        this.users.set(1, {
            userId: 1,
            username: "sayandeep",
            password: "sayandeep123",
            balances: {
                usd: {
                    total: 10000,      
                    available: 8980,   
                    margin_used: 1020  
                }
            }
        });
        
        this.updatePrice('BTCUSDT', 100000, 102000);
        this.updatePrice('btc', 100000, 102000); 
    }
    
    async placeOrder(
        userId: number, 
        symbol: string, 
        side: 'buy' | 'sell', 
        margin: number, 
        leverage: number,
        orderType: 'market' | 'limit' = 'market',
        limitPrice?: number
    ): Promise<Order> {
        
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');
        
        const maxLeverage = this.config.max_leverage[symbol] || 1;
        if (leverage > maxLeverage) {
            throw new Error(`Max leverage for ${symbol} is ${maxLeverage}x`);
        }
        
        if (user.balances.usd.available < margin) {
            throw new Error(`Insufficient balance. Available: $${user.balances.usd.available}, Required: $${margin}`);
        }
        
        const position_size = margin * leverage;
        
        if (position_size > this.config.max_position_size) {
            throw new Error(`Position size $${position_size} exceeds max $${this.config.max_position_size}`);
        }
        
        const marketData = this.prices.get(symbol);
        if (!marketData) {
            throw new Error(`Price data not available for ${symbol}`);
        }
        
        const entry_price = side === 'buy' ? marketData.ask : marketData.bid;
        const quantity = position_size / entry_price;
        
        const liquidation_price = this.calculateLiquidationPrice(entry_price, leverage, side);
        
        user.balances.usd.available -= margin;
        user.balances.usd.margin_used += margin;
        
        const order: Order = {
            orderId: uuidv4(),
            userId,
            symbol,
            side,
            type: orderType,
            leverage,
            margin,
            position_size,
            quantity,
            entry_price,
            current_price: entry_price,
            limit_price: limitPrice,
            liquidation_price,
            status: 'filled', 
            created_at: new Date(),
            filled_at: new Date()
        };
        
        this.orders.set(order.orderId, order);
        
        this.createPosition(order);
        
        console.log(`Order placed: ${side} ${symbol} | Margin: $${margin} | Leverage: ${leverage}x | Position: $${position_size}`);
        
        return order;
    }
    
    private createPosition(order: Order): Position {
        const position: Position = {
            positionId: uuidv4(),
            userId: order.userId,
            symbol: order.symbol,
            side: order.side === 'buy' ? 'long' : 'short',
            leverage: order.leverage,
            margin: order.margin,
            position_size: order.position_size,
            quantity: order.quantity,
            entry_price: order.entry_price,
            current_price: order.entry_price,
            unrealized_pnl: 0,
            realized_pnl: 0,
            roi_percentage: 0,
            liquidation_price: order.liquidation_price,
            margin_ratio: 1.0, 
            status: 'open',
            opened_at: new Date()
        };
        
        this.positions.set(position.positionId, position);
        console.log(`Position opened: ${position.positionId} | ${position.side} ${position.symbol}`);
        
        return position;
    }
    
    private calculateLiquidationPrice(entry_price: number, leverage: number, side: 'buy' | 'sell'): number {
        const safety_margin = (1 / leverage) * (1 - this.config.margin_call_ratio);
        const fee_adjustment = this.config.liquidation_fee;
        const total_buffer = safety_margin + fee_adjustment;
        
        if (side === 'buy') {
            return entry_price * (1 - total_buffer);
        } else {
            return entry_price * (1 + total_buffer);
        }
    }
    
    updatePrice(symbol: string, bid: number, ask: number): void {
        const spread = ask - bid;
        this.prices.set(symbol, {
            symbol,
            bid,
            ask,
            spread,
            timestamp: new Date()
        });
        
        this.updatePositionPrices(symbol, (bid + ask) / 2);
    }
    
    private updatePositionPrices(symbol: string, currentPrice: number): void {
        for (const [positionId, position] of this.positions.entries()) {
            if (position.symbol === symbol && position.status === 'open') {
                position.current_price = currentPrice;
                position.unrealized_pnl = this.calculateUnrealizedPnL(position);
                position.roi_percentage = (position.unrealized_pnl / position.margin) * 100;
                position.margin_ratio = (position.margin + position.unrealized_pnl) / position.position_size;
                
                this.checkPositionLiquidation(position);
            }
        }
    }
    
    private calculateUnrealizedPnL(position: Position): number {
        const price_difference = position.side === 'long' 
            ? position.current_price - position.entry_price
            : position.entry_price - position.current_price;
            
        return price_difference * position.quantity;
    }
    
    private checkPositionLiquidation(position: Position): void {
        const liquidationBuffer = this.config.liquidation_buffer; 
        
        const preemptiveLiquidationPrice = position.side === 'long'
            ? position.liquidation_price * (1 + liquidationBuffer)  
            : position.liquidation_price * (1 - liquidationBuffer); 
        
        const shouldLiquidateByPrice = position.side === 'long' 
            ? position.current_price <= preemptiveLiquidationPrice
            : position.current_price >= preemptiveLiquidationPrice;
            
        const shouldLiquidateByMargin = position.margin_ratio <= this.config.margin_call_ratio;
            
        if (shouldLiquidateByPrice || shouldLiquidateByMargin) {
            console.log(`🔥 Liquidating ${position.positionId}: Price=${position.current_price}, Preemptive=${preemptiveLiquidationPrice.toFixed(2)}, Margin=${(position.margin_ratio * 100).toFixed(1)}%`);
            this.liquidatePosition(position.positionId, 'margin_call');
        }
    }

    liquidatePosition(positionId: string, reason: 'margin_call' | 'stop_loss' | 'take_profit'): void {
        const position = this.positions.get(positionId);
        if (!position || position.status !== 'open') return;
        
        const user = this.users.get(position.userId);
        if (!user) return;
        
        const final_pnl = position.unrealized_pnl;
        const liquidation_fee = position.position_size * this.config.liquidation_fee;
        const net_pnl = final_pnl - liquidation_fee;
        
        const remaining_margin = Math.max(0, position.margin + net_pnl);
        const margin_lost = position.margin - remaining_margin;
        
        user.balances.usd.available += remaining_margin;
        user.balances.usd.margin_used -= position.margin;
        
        position.status = 'liquidated';
        position.realized_pnl = final_pnl;
        position.closed_at = new Date();
        
        const liquidation: LiquidationEvent = {
            positionId,
            userId: position.userId,
            symbol: position.symbol,
            liquidation_price: position.current_price,
            margin_lost,
            timestamp: new Date(),
            reason
        };
        
        this.liquidations.push(liquidation);
        
        console.log(`🔥 LIQUIDATION: Position ${positionId} | Loss: $${margin_lost.toFixed(2)} | Fee: $${liquidation_fee.toFixed(2)}`);
    }
    
    async closePosition(positionId: string, userId: number): Promise<Position> {
        const position = this.positions.get(positionId);
        if (!position) throw new Error('Position not found');
        if (position.userId !== userId) throw new Error('Unauthorized');
        if (position.status !== 'open') throw new Error('Position not open');
        
        const user = this.users.get(userId);
        if (!user) throw new Error('User not found');
        
        const net_pnl = position.unrealized_pnl;
        
        const final_amount = position.margin + net_pnl;
        user.balances.usd.available += final_amount;
        user.balances.usd.margin_used -= position.margin;
        
        position.status = 'closed';
        position.realized_pnl = position.unrealized_pnl;
        position.closed_at = new Date();
        
        console.log(`Position closed: ${positionId} | P&L: $${net_pnl.toFixed(2)}`);
        
        return position;
    }
    
    private startPriceMonitoring(): void {
        setInterval(() => {
            this.checkAllLiquidations();
        }, 1000); 
    }
    
    updatePriceFromExternalSource(symbol: string, price: number, spread: number = 100): void {
        this.updatePrice(symbol, price - spread/2, price + spread/2);
    }
    
    private checkAllLiquidations(): void {
        for (const position of this.positions.values()) {
            if (position.status === 'open') {
                this.checkPositionLiquidation(position);
            }
        }
    }
    
    createUser(userId: number, username: string, email: string = '', startingBalance: number = 10000): User {
        if (this.users.has(userId)) {
            throw new Error(`User with ID ${userId} already exists`);
        }
        
        const newUser: User = {
            userId,
            username,
            password: '', 
            balances: {
                usd: {
                    total: startingBalance,
                    available: startingBalance,
                    margin_used: 0
                }
            }
        };
        
        this.users.set(userId, newUser);
        console.log(`Created new user: ${userId} (${username}) with balance $${startingBalance}`);
        
        return newUser;
    }

    getUser(userId: number): User | undefined {
        return this.users.get(userId);
    }
    
    getUserPositions(userId: number): Position[] {
        return Array.from(this.positions.values())
            .filter(pos => pos.userId === userId);
    }
    
    getUserOrders(userId: number): Order[] {
        return Array.from(this.orders.values())
            .filter(order => order.userId === userId);
    }
    
    getMarketPrice(symbol: string): MarketPrice | undefined {
        return this.prices.get(symbol);
    }
    
    getAllPrices(): Map<string, MarketPrice> {
        return this.prices;
    }
    
    getLiquidations(): LiquidationEvent[] {
        return this.liquidations;
    }
    
    convertLegacyOrder(legacyOrder: any): Order {
        const symbol = legacyOrder.asset === 'btc' ? 'BTCUSDT' : legacyOrder.asset.toUpperCase() + 'USDT';
        const side = legacyOrder.type === 'long' ? 'buy' : 'sell';
        
        return {
            orderId: legacyOrder.orderId.toString(),
            userId: legacyOrder.userId,
            symbol,
            side,
            type: 'market',
            leverage: legacyOrder.leverage || 1,
            margin: legacyOrder.margin,
            position_size: legacyOrder.margin * (legacyOrder.leverage || 1),
            quantity: legacyOrder.qty,
            entry_price: legacyOrder.buy,
            liquidation_price: this.calculateLiquidationPrice(legacyOrder.buy, legacyOrder.leverage || 1, side),
            status: 'filled',
            created_at: new Date(),
            filled_at: new Date()
        };
    }
}