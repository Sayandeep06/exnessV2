import express from 'express'
import { pool } from 'db/db'

export const klinesRouter = express.Router()

klinesRouter.get('/candles', async (req, res) => {
    try {
        const { asset, startTime, endTime, ts } = req.query

        if (!asset) {
            return res.status(400).json({ message: "Asset parameter is required" })
        }

        const symbol = asset.toString()
        const timeframe = ts || '1m'
        
        let tableName = 'klines_1m'
        if (timeframe === '5m') tableName = 'klines_5m'
        else if (timeframe === '1h') tableName = 'klines_1h'
        else if (timeframe === '1d') tableName = 'klines_1d'

        let query = `
            SELECT 
                EXTRACT(EPOCH FROM bucket)::bigint as timestamp,
                (open * 100000000)::bigint as open,
                (high * 100000000)::bigint as high, 
                (low * 100000000)::bigint as low,
                (close * 100000000)::bigint as close,
                volume::bigint as volume,
                8 as decimal
            FROM ${tableName}
            WHERE symbol = $1
        `
        
        const params = [symbol]
        
        if (startTime && endTime) {
            query += ` AND bucket >= to_timestamp($2) AND bucket <= to_timestamp($3)`
            params.push(startTime.toString(), endTime.toString())
        } else {
            query += ` ORDER BY bucket DESC LIMIT 100`
        }
        
        query += ` ORDER BY bucket ASC`

        const result = await pool.query(query, params)
        
        const candles = result.rows.map(row => ({
            timestamp: row.timestamp,
            open: row.open,
            high: row.high,
            low: row.low,
            close: row.close,
            volume: row.volume,
            decimal: row.decimal
        }))

        res.status(200).json({ candles })
        console.log(candles)
        
    } catch (error) {
        console.error('Error fetching klines:', error)
        res.status(500).json({
            message: "Internal server error"
        })
    }
})
