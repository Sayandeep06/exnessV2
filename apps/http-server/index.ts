import express from 'express'
import { tickerRouter } from './routes/ticker'
import { userRouter } from './routes/user'
import { assetsRouter } from './routes/assets'
import { tradingRouter } from './routes/trading'
import cors from 'cors'

const app = express()
app.use(cors({
    origin:"*"
}))
app.use(express.json())

app.use('/api/v1/order', userRouter)
app.use('/api/v1', tickerRouter)
app.use('/api/v1', assetsRouter)
app.use('/api/v1/trading', tradingRouter)

app.listen(3000, ()=>{
    console.log(`API Server: http://localhost:3000`)
})