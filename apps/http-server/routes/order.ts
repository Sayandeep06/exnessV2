import express from 'express'
import { middleware } from '../middleware'

export const orderRouter = express.Router()

orderRouter.post('/trade', middleware, async (req, res) => {
    try {
        const { asset, type, margin, leverage } = req.body
        
        res.status(200).json({
            orderId: "uuid"
        })
    } catch (error) {
        res.status(411).json({
            message: "Incorrect inputs"
        })
    }
})

orderRouter.get('/trades/open', middleware, async (req, res) => {
    try {
        res.status(200).json({
            trades: [
                {
                    orderId: "uuid",
                    type: "buy",
                    margin: 50000,
                    leverage: 10,
                    openPrice: 1000000000
                }
            ]
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})

orderRouter.get('/trades', middleware, async (req, res) => {
    try {
        res.status(200).json({
            trades: [
                {
                    orderId: "uuid",
                    type: "buy",
                    margin: 50000,
                    leverage: 10,
                    openPrice: 1000000000,
                    closePrice: 2000000000,
                    pnl: 500000
                }
            ]
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})