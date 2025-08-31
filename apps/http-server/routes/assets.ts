import express from 'express'

export const assetsRouter = express.Router()

assetsRouter.get('/assets', async (req, res) => {
    try {
        res.status(200).json({
            assets: [
                {
                    name: "Bitcoin",
                    symbol: "BTC",
                    buyPrice: 1002000000,
                    sellPrice: 1000000000,
                    decimals: 4,
                    imageUrl: "image_url"
                },
                {
                    name: "Solana",
                    symbol: "SOL", 
                    buyPrice: 2100000,
                    sellPrice: 2000000,
                    decimals: 4,
                    imageUrl: "image_url"
                },
                {
                    name: "Ethereum",
                    symbol: "ETH",
                    buyPrice: 40200000,
                    sellPrice: 39800000,
                    decimals: 4,
                    imageUrl: "image_url"
                }
            ]
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})