import express from 'express';
import { engine } from '../../engine/index';
import type { Order, Position } from '../../engine/types';
import { RedisClient } from '../RedisManager';

export const tradingRouter = express.Router();


tradingRouter.post('/orders', async (req, res) => {
    try {
        const { userId, symbol, side, margin, leverage, type = 'market', limitPrice } = req.body;
        

        if (!userId || !symbol || !side || !margin || !leverage) {
            return res.status(400).json({
                error: 'Missing required fields: userId, symbol, side, margin, leverage'
            });
        }
        
        if (margin <= 0 || leverage <= 0) {
            return res.status(400).json({
                error: 'Margin and leverage must be positive numbers'
            });
        }
        
        if (!['buy', 'sell'].includes(side)) {
            return res.status(400).json({
                error: 'Side must be "buy" or "sell"'
            });
        }

        
        const tradingSide = side === 'buy' ? 'long' : 'short';
        
        
        const orderRequest = {
            action: 'place_order',
            data: {
                userId: parseInt(userId),
                symbol: symbol.toUpperCase(),
                side: tradingSide,
                margin: parseFloat(margin),
                leverage: parseInt(leverage),
                type,
                limitPrice: limitPrice ? parseFloat(limitPrice) : undefined
            }
        };

        
        const redisClient = RedisClient.getInstance();
        const response = await redisClient.publishSubscribe(JSON.stringify(orderRequest));
        
        if (response.success) {
            res.status(201).json({
                success: true,
                data: response.data,
                message: `${side.toUpperCase()} order placed successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                error: response.error || 'Failed to place order'
            });
        }
        
    } catch (error: any) {
        console.error('Error placing order:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to place order'
        });
    }
});


tradingRouter.get('/orders/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const orders = engine.getUserOrders(userId);
        
        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

  
tradingRouter.get('/positions/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const positions = engine.getUserPositions(userId);
        
        
        const totalUnrealizedPnL = positions
            .filter(pos => pos.status === 'open')
            .reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
            
        const totalMarginUsed = positions
            .filter(pos => pos.status === 'open')
            .reduce((sum, pos) => sum + pos.margin, 0);
        
        res.json({
            success: true,
            data: positions,
            summary: {
                total_positions: positions.length,
                open_positions: positions.filter(pos => pos.status === 'open').length,
                total_unrealized_pnl: totalUnrealizedPnL,
                total_margin_used: totalMarginUsed
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


tradingRouter.post('/positions/:positionId/close', async (req, res) => {
    try {
        const { positionId } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }
        
        const position = await engine.closePosition(positionId, parseInt(userId));
        
        res.json({
            success: true,
            data: position,
            message: 'Position closed successfully'
        });
        
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


tradingRouter.get('/account/:userId', (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = engine.getUser(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const positions = engine.getUserPositions(userId);
        const orders = engine.getUserOrders(userId);
        
        
        const openPositions = positions.filter(pos => pos.status === 'open');
        const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);
        const equity = user.balances.usd.total + totalUnrealizedPnL;
        const freeMargin = user.balances.usd.available;
        const marginLevel = user.balances.usd.margin_used > 0 
            ? (equity / user.balances.usd.margin_used) * 100 
            : 0;
        
        res.json({
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
                    free_margin: freeMargin,
                    margin_used: user.balances.usd.margin_used,
                    margin_level: marginLevel,
                    unrealized_pnl: totalUnrealizedPnL
                },
                positions: {
                    total: positions.length,
                    open: openPositions.length,
                    closed: positions.filter(pos => pos.status === 'closed').length,
                    liquidated: positions.filter(pos => pos.status === 'liquidated').length
                },
                orders: {
                    total: orders.length
                }
            }
        });
        
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});



tradingRouter.get('/liquidations', (req, res) => {
    try {
        const { userId, limit = 50 } = req.query;
        let liquidations = engine.getLiquidations();
        
        if (userId) {
            liquidations = liquidations.filter(liq => liq.userId === parseInt(userId as string));
        }
        
        
        liquidations = liquidations
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, parseInt(limit as string));
        
        res.json({
            success: true,
            data: liquidations,
            count: liquidations.length
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Legacy endpoint compatibility - place order via /trade endpoint
tradingRouter.post('/trade', async (req, res) => {
    try {
        const { asset, type, margin, leverage } = req.body;
        
        if (!asset || !type || !margin || !leverage) {
            return res.status(400).json({
                message: "Missing required fields: asset, type, margin, leverage"
            });
        }

        if (!['buy', 'sell'].includes(type)) {
            return res.status(400).json({
                message: "Type must be 'buy' or 'sell'"
            });
        }

        const side = type === 'buy' ? 'long' : 'short';
        
        const orderMessage = {
            action: 'place_order',
            data: {
                userId: (req as any).userId, 
                symbol: asset.toUpperCase(),
                side: side,
                margin: parseFloat(margin),
                leverage: parseInt(leverage),
                type: 'market'
            }
        };

        const redisClient = RedisClient.getInstance();
        const response = await redisClient.publishSubscribe(JSON.stringify(orderMessage));
        
        if (response.success) {
            res.status(200).json({
                success: true,
                orderId: response.data.orderId,
                message: `${type.toUpperCase()} order placed successfully`
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.error || "Failed to place order"
            });
        }
        
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(411).json({
            message: "Error processing order"
        });
    }
});

// Legacy endpoint compatibility - get open trades
tradingRouter.get('/trades/open', async (req, res) => {
    try {
        const redisClient = RedisClient.getInstance();
        const positionMessage = {
            action: 'get_positions',
            data: {
                userId: (req as any).userId
            }
        };
        
        const response = await redisClient.publishSubscribe(JSON.stringify(positionMessage));
        
        if (response.success) {
            const openTrades = response.data
                .filter((pos: any) => pos.status === 'open')
                .map((pos: any) => ({
                    orderId: pos.positionId,
                    type: pos.side === 'long' ? 'buy' : 'sell',
                    asset: pos.symbol,
                    margin: pos.margin,
                    leverage: pos.leverage,
                    openPrice: pos.entry_price,
                    currentPrice: pos.current_price,
                    pnl: pos.unrealized_pnl,
                    roi: pos.roi_percentage
                }));
            
            res.status(200).json({
                success: true,
                trades: openTrades
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Failed to get open trades"
            });
        }
    } catch (error) {
        console.error('Error getting open trades:', error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

// Legacy endpoint compatibility - get all trades  
tradingRouter.get('/trades', async (req, res) => {
    try {
        const redisClient = RedisClient.getInstance();
        const positionMessage = {
            action: 'get_positions',
            data: {
                userId: (req as any).userId
            }
        };
        
        const response = await redisClient.publishSubscribe(JSON.stringify(positionMessage));
        
        if (response.success) {
            const allTrades = response.data.map((pos: any) => ({
                orderId: pos.positionId,
                type: pos.side === 'long' ? 'buy' : 'sell',
                asset: pos.symbol,
                margin: pos.margin,
                leverage: pos.leverage,
                openPrice: pos.entry_price,
                closePrice: pos.status === 'closed' ? pos.current_price : null,
                pnl: pos.status === 'closed' ? pos.realized_pnl : pos.unrealized_pnl,
                roi: pos.roi_percentage,
                status: pos.status,
                openedAt: pos.opened_at,
                closedAt: pos.closed_at
            }));
            
            res.status(200).json({
                success: true,
                trades: allTrades
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Failed to get trades"
            });
        }
    } catch (error) {
        console.error('Error getting trades:', error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

tradingRouter.get('/health', (req, res) => {
    const prices = engine.getAllPrices();
    const priceCount = prices.size;
    
    res.json({
        success: true,
        status: 'healthy',
        data: {
            trading_engine: 'active',
            price_feeds: priceCount > 0 ? 'active' : 'inactive',
            price_symbols: priceCount,
            timestamp: new Date()
        }
    });
});