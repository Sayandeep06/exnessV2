import express from 'express'
export const orderRouter = express.Router()
import { middleware } from '../middleware'
// import {RedisClient} from '../RedisManager'


orderRouter.post('/order', middleware, async (req, res)=>{
    try{
        const { market, price, quantity, side, userId } = req.body;

        // res.json(response);
    }catch(error){
        console.log(error)
        res.json(error)
    }
})

orderRouter.get('/order', middleware, async (req, res)=>{
    try{   
        const market = req.query.market as string
        const userId = req.userId as string

        // res.json(response)
    }catch(error){
        res.json(error);
    }
})

orderRouter.post('/order:orderId', middleware, async (req, res)=>{
    try{
        const orderId = req.params.orderId as string;
        const userId = req.userId as string;
        const market = req.body.market as string;

        // res.json(response)
    }catch(error){
        res.json(error)
    }
})