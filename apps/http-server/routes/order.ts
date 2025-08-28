import express from 'express'
export const orderRouter = express.Router()
import { middleware } from '../middleware'
import {RedisClient} from '../RedisManager'
import type {MessageFromEngine} from 'types'

orderRouter.post('/order', middleware, async (req, res)=>{
    try{
        const { market, price, quantity, side, userId } = req.body;
        const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
            type: 'CREATE_ORDER',
            data: {
                market,
                price,
                quantity,
                side,
                userId
            }
        });
        res.json(response);
    }catch(error){
        console.log(error)
        res.json(error)
    }
})

orderRouter.get('/order', middleware, async (req, res)=>{
    try{   
        const market = req.query.market as string
        const userId = req.userId as string

        const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
            type: 'GET_OPEN_ORDERS',
            data:{
                userId,
                market
            }
        })
        res.json(response)
    }catch(error){
        res.json(error);
    }
})

orderRouter.post('/order:orderId', middleware, async (req, res)=>{
    try{
        const orderId = req.params.orderId as string;
        const userId = req.userId as string;
        const market = req.body.market as string;

        const response: MessageFromEngine = await RedisClient.getInstance().publishSubscribe({
            type: 'CANCEL_ORDER',
            data: {
                orderId,
                market
            }
        })
        res.json(response)
    }catch(error){
        res.json(error)
    }
})