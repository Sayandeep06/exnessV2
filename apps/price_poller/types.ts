export interface BinanceTradeEvent {
    e: string;           // Event type ("aggTrade")
    E: number;           // Event time
    s: string;           // Symbol
    t: number;           // Trade ID
    p: string;           // Price
    q: string;           // Quantity
    b: number;           // Buyer order ID
    a: number;           // Seller order ID
    T: number;           // Trade time
    m: boolean;          // Is buyer maker
    M: boolean;          // Ignore
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