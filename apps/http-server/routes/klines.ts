import express from 'express'
import WebSocket from 'ws'

export const klinesRouter = express.Router()

async function getCandlesFromWebSocket(symbol: string, timeframe: string, limit: number = 100): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080');
        const candlesData: any[] = [];
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket timeout'));
        }, 10000);

        ws.on('open', () => {
            // Subscribe to candles
            ws.send(JSON.stringify({
                action: 'subscribe',
                symbol: symbol.toLowerCase(),
                interval: timeframe
            }));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.status === 'subscribed') {
                    // Wait a bit more for candles to arrive
                    setTimeout(() => {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(candlesData.slice(-limit)); // Return last 'limit' candles
                    }, 2000);
                } else if (message.type === 'candle') {
                    const candle = message.data;
                    candlesData.push({
                        timestamp: candle.timestamp,
                        open: Math.floor(candle.open * 100000000),
                        high: Math.floor(candle.high * 100000000),
                        low: Math.floor(candle.low * 100000000),
                        close: Math.floor(candle.close * 100000000),
                        volume: Math.floor(candle.volume),
                        decimal: 8
                    });
                }
            } catch (error) {
                clearTimeout(timeout);
                ws.close();
                reject(error);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        ws.on('close', () => {
            clearTimeout(timeout);
            if (candlesData.length === 0) {
                reject(new Error('No candles received'));
            }
        });
    });
}

klinesRouter.get('/candles', async (req, res) => {
    try {
        const { asset, startTime, endTime, ts } = req.query

        if (!asset) {
            return res.status(400).json({ message: "Asset parameter is required" })
        }

        const symbol = asset.toString()
        const timeframe = (ts || '1m').toString()

        const candles = await getCandlesFromWebSocket(symbol, timeframe, 100);

        res.status(200).json({ candles })
        console.log(`Received ${candles.length} candles from WebSocket`)
        
    } catch (error) {
        console.error('Error fetching klines:', error)
        res.status(500).json({
            message: "Internal server error"
        })
    }
})
