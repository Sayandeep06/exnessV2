import {createClient} from 'redis';
import {pool} from './db'

// symbol TEXT NOT NULL,
// trade_id BIGINT NOT NULL,
// price NUMERIC(18,8) NOT NULL,
// quantity NUMERIC(18,8) NOT NULL,
// is_maker BOOLEAN NOT NULL,
// event_time TIMESTAMPTZ NOT NULL,
// trade_time TIMESTAMPTZ NOT NULL

//need 1 min , 5min, 1hr, 1 day, 1 month

export const pushToDB = async () => {
    const client = createClient()
    try {
        await client.connect();
        console.log('Connected to Redis')
    } catch (error) {
        console.error('Failed to connect to Redis:', error)
        process.exit(1)
    }
    
    while(true){
        try {
            const message = await client.rPop('prices')
            if(!message){
                await new Promise(resolve => setTimeout(resolve, 1000))
            }else{
                const data = JSON.parse(message);
                await pool.query(`
                    INSERT INTO trades (symbol, trade_id, price, quantity, is_maker, event_time, trade_time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [data.symbol, data.trade_id, data.price, data.quantity, data.is_maker, data.event_time, data.trade_time])
                console.log(`Inserted trade for ${data.symbol} at price ${data.price}`)
            }
        } catch (error) {

            await new Promise(resolve => setTimeout(resolve, 5000))
        }
    }
}

pushToDB()
