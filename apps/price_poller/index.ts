import WebSocket from 'ws';
import type { BinanceTradeEvent, TradeData } from './types';
import {RedisManager} from './RedisManager'

const wsUrl = 'wss://fstream.binance.com/ws/btcusdt@trade';

class PricePoller{
    private ws: WebSocket;
    constructor(){
        this.ws = new WebSocket(wsUrl);
        this.connect()
    }
    public connect(){
        this.ws.onopen = () => {
            console.log("Connection established")
        }
        this.ws.onmessage = (event) => {
            try{
                const binanceEvent: BinanceTradeEvent = JSON.parse(event.data as string);
                
                // Transform to our custom format
                const tradeData: TradeData = {
                    symbol: binanceEvent.s,
                    trade_id: binanceEvent.t,
                    price: parseFloat(binanceEvent.p),
                    quantity: parseFloat(binanceEvent.q),
                    is_maker: binanceEvent.m,
                    event_time: new Date(binanceEvent.E),
                    trade_time: new Date(binanceEvent.T)
                };
                
                RedisManager.getInstance().send(tradeData)
                console.log(`Trade: ${tradeData.symbol} - ${tradeData.price} x ${tradeData.quantity}`);
            }catch(error){
                console.log(error)
            }
        }
        this.ws.onerror = (error) =>{
            console.log(error)
        }
    }
    public close = () => {
        this.ws.close();
    }
}

const poller = new PricePoller();