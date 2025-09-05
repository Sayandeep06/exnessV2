import { pool } from 'db/db';

export interface Candle {
    symbol: string;
    interval: string;
    bucket: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    trade_count: number;
}

export class CandleService {
    async getRecentCandles(
        interval: string, 
        limit: number = 100, 
        symbol: string = 'BTCUSDT'
    ): Promise<Candle[]> {
        const tableName = `klines_${interval}`;
        const query = `
            SELECT 
                symbol,
                '${interval}' as interval,
                bucket,
                open,
                high,
                low,
                close,
                volume,
                trade_count
            FROM ${tableName} 
            WHERE symbol = $1
            ORDER BY bucket DESC
            LIMIT $2
        `;
        
        try {
            const result = await pool.query(query, [symbol, limit]);
            return result.rows.map(row => ({
                ...row,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseFloat(row.volume),
                trade_count: parseInt(row.trade_count)
            }));
        } catch (error) {
            console.error(`Error fetching recent ${interval} candles:`, error);
            return [];
        }
    }

    async getCandlesInRange(
        interval: string, 
        symbol: string,
        startTime: Date, 
        endTime: Date
    ): Promise<Candle[]> {
        const tableName = `klines_${interval}`;
        const query = `
            SELECT 
                symbol,
                '${interval}' as interval,
                bucket,
                open,
                high,
                low,
                close,
                volume,
                trade_count
            FROM ${tableName} 
            WHERE symbol = $1 
                AND bucket >= $2 
                AND bucket <= $3
            ORDER BY bucket ASC
        `;
        
        try {
            const result = await pool.query(query, [symbol, startTime, endTime]);
            return result.rows.map(row => ({
                ...row,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseFloat(row.volume),
                trade_count: parseInt(row.trade_count)
            }));
        } catch (error) {
            console.error(`Error fetching ${interval} candles in range:`, error);
            return [];
        }
    }
}