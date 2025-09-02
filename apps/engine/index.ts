
export const users = [
    {
        userId: 1,
        username: "sayandeep",
        password: "sayandeep123",
        balances:{
            usd: {
                tradable: 3080,
            }
        }
    }
]

export const prices = new Map<string, number>();

prices.set("btc_buy", 102000);
prices.set('btc_sell', 100000)

export const openOrders = [{
    orderId: 1,
    userId: 1,
    type: 'long',
    asset: 'btc',
    buy: 10200,
    margin: 1020,
    qty: 0.01
}
]
