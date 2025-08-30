import { pool } from "./db";

export async function createSchema() {
  
    await pool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;`);

    await pool.query(`DROP TABLE IF EXISTS trades CASCADE;`);


    await pool.query(`
    CREATE TABLE trades (
        symbol TEXT NOT NULL,
        trade_id BIGINT NOT NULL,
        price NUMERIC(18,8) NOT NULL,
        quantity NUMERIC(18,8) NOT NULL,
        is_maker BOOLEAN NOT NULL,
        event_time TIMESTAMPTZ NOT NULL,
        trade_time TIMESTAMPTZ NOT NULL
    );
    `);

    await pool.query(`
    SELECT create_hypertable(
        'trades',
        'trade_time',
        if_not_exists => TRUE,
        chunk_time_interval => INTERVAL '1 hour'
    );
    `);

}