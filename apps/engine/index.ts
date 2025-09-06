import { TradingEngine } from './TradingEngine';
import type { User, Order, Position, side } from './types';
import { createClient } from 'redis';


export const engine = TradingEngine.getInstance();


const redisClient = createClient();
const redisPublisher = createClient();

async function initializeRedis() {
    try {
        await redisClient.connect();
        await redisPublisher.connect();
        console.log('Engine Redis client connected');
        
        processOrderQueue();
        processPriceQueue();
    } catch (error) {
        console.error('Failed to connect Engine Redis client:', error);
    }
}


async function processPriceQueue() {
    while (true) {
        try {
            const priceMessage = await redisClient.rPop('prices');
            if (priceMessage) {
                const tradeData = JSON.parse(priceMessage);
                // Convert Binance trade data to bid/ask prices (simplified with spread)
                const spread = 100; // $100 spread
                const price = tradeData.price;
                engine.updatePriceFromExternalSource(tradeData.symbol, price, spread);
            }
        } catch (error) {
            console.error('Error processing price queue:', error);
        }
        
        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function processOrderQueue() {
    while (true) {
        try {
            const message = await redisClient.rPop('ToEngine');
            if (!message) {
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }
            
            const request = JSON.parse(message);
            const { id, message: orderMessage } = request;
            const orderData = JSON.parse(orderMessage);
            
            console.log('Processing order:', orderData.action, orderData.data);
            
            let response;
            try {
                switch (orderData.action) {
                    case 'place_order':
                        const order = await engine.placeOrder(
                            orderData.data.userId,
                            orderData.data.symbol,
                            orderData.data.side,
                            orderData.data.margin,
                            orderData.data.leverage,
                            orderData.data.type || 'market',
                            orderData.data.limitPrice
                        );
                        response = { success: true, data: order };
                        break;
                    
                    case 'get_positions':
                        const positions = engine.getUserPositions(orderData.data.userId);
                        response = { success: true, data: positions };
                        break;
                    
                    case 'get_orders':
                        const orders = engine.getUserOrders(orderData.data.userId);
                        response = { success: true, data: orders };
                        break;
                    
                    case 'close_position':
                        const closedPosition = await engine.closePosition(
                            orderData.data.positionId,
                            orderData.data.userId
                        );
                        response = { success: true, data: closedPosition };
                        break;
                    
                    case 'create_user':
                        const newUser = engine.createUser(
                            orderData.data.userId,
                            orderData.data.username,
                            orderData.data.email || '',
                            orderData.data.startingBalance
                        );
                        response = { success: true, data: newUser };
                        break;
                    
                    case 'get_account':
                        const user = engine.getUser(orderData.data.userId);
                        if (user) {
                            const positions = engine.getUserPositions(orderData.data.userId);
                            const openPositions = positions.filter(pos => pos.status === 'open');
                            const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
                            const equity = user.balances.usd.total + totalUnrealizedPnL;
                            const marginLevel = user.balances.usd.margin_used > 0 
                                ? (equity / user.balances.usd.margin_used) * 100 
                                : 0;
                            
                            response = { 
                                success: true, 
                                data: {
                                    user: {
                                        userId: user.userId,
                                        username: user.username,
                                        balances: user.balances
                                    },
                                    account_metrics: {
                                        equity: equity,
                                        balance: user.balances.usd.total,
                                        free_margin: user.balances.usd.available,
                                        margin_used: user.balances.usd.margin_used,
                                        margin_level: marginLevel,
                                        unrealized_pnl: totalUnrealizedPnL
                                    }
                                }
                            };
                        } else {
                            response = { success: false, error: 'User not found' };
                        }
                        break;
                    
                    default:
                        response = { success: false, error: 'Unknown action' };
                }
            } catch (error: any) {
                response = { success: false, error: error.message };
            }
            
            await redisPublisher.publish(id, JSON.stringify(response));
            
        } catch (error) {
            console.error('Error processing order queue:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}


initializeRedis();


export const users = [
    {
        userId: 1,
        username: "sayandeep",
        password: "sayandeep123",
        balances: {
            usd: {
                tradable: 3080,
            }
        }
    }
];

export const prices = new Map<string, number>();
prices.set("btc_buy", 102000);
prices.set('btc_sell', 100000);

export const openOrders = [
    {
        orderId: 1,
        userId: 1,
        type: 'long',
        asset: 'btc',
        buy: 10200,
        margin: 1020,
        leverage: 10,
        qty: 0.01
    }
];


export type { side, User, Order, Position };


export default engine;