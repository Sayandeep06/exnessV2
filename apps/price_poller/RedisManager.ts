import { createClient, type RedisClientType} from "redis";
import type {TradeData} from './types'

export class RedisManager{
    private publisher: RedisClientType;
    private static instance: RedisManager;

    constructor(){
        this.publisher = createClient()
        this.publisher.connect().catch(error => {
            console.error('Failed to connect to Redis:', error)
        });
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager()
        }
        return this.instance
    }
    
    public send(messages: TradeData){
        this.publisher.lPush('prices', JSON.stringify(messages)).catch(error => {
            console.error('Failed to send message to Redis:', error)
        })
    }
}