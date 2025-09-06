import { createClient } from "redis";
import type { RedisClientType } from "redis";


export class RedisClient{
    private publisher: RedisClientType;
    private subscriber: RedisClientType;
    private static instance: RedisClient
    constructor(){
        this.publisher = createClient();
        this.subscriber = createClient();
        this.connect()
    }

    private async connect(){
        await this.publisher.connect();
        await this.subscriber.connect()
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisClient;
        }
        return this.instance
    }

    public publishSubscribe(message: string){
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return new Promise<any>((resolve)=>{
            this.subscriber.subscribe(id, (message)=>{
                this.subscriber.unsubscribe(id)
                resolve(JSON.parse(message))
            })
            this.publisher.lPush("ToEngine", JSON.stringify({id, message}))
        })
    }


}