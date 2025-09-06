export interface BinanceTradeEvent {
    e: string;           
    E: number;           
    s: string;           
    t: number;           
    p: string;           
    q: string;           
    b: number;           
    a: number;           
    T: number;           
    m: boolean;          
    M: boolean;          
}

export interface TradeData {
    symbol: string;
    trade_id: number;
    price: number;
    quantity: number;
    is_maker: boolean;
    event_time: Date;
    trade_time: Date;
}