import express from 'express'

export const klinesRouter = express.Router()

klinesRouter.get('/candles', async (req, res) => {
    try {
        const { asset, startTime, endTime, ts } = req.query

        res.status(200).json({
            candles: [
                {
                    timestamp: 1640995200,
                    open: 2000000,
                    close: 2100000,
                    high: 2200000,
                    low: 1950000,
                    decimal: 4
                }
            ]
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})