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
    await createKlineMaterializedViews();
}

export async function createKlineMaterializedViews() {

    await pool.query(`
        DROP MATERIALIZED VIEW IF EXISTS klines_1m CASCADE;
        CREATE MATERIALIZED VIEW klines_1m
        WITH (timescaledb.continuous) AS
        SELECT 
            symbol,
            time_bucket('1 minute', trade_time) AS bucket,
            first(price, trade_time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, trade_time) AS close,
            sum(quantity) AS volume,
            count(*) AS trade_count
        FROM trades
        GROUP BY symbol, bucket
        WITH NO DATA;
    `);

    await pool.query(`
        DROP MATERIALIZED VIEW IF EXISTS klines_5m CASCADE;
        CREATE MATERIALIZED VIEW klines_5m
        WITH (timescaledb.continuous) AS
        SELECT 
            symbol,
            time_bucket('5 minutes', trade_time) AS bucket,
            first(price, trade_time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, trade_time) AS close,
            sum(quantity) AS volume,
            count(*) AS trade_count
        FROM trades
        GROUP BY symbol, bucket
        WITH NO DATA;
    `);

    await pool.query(`
        DROP MATERIALIZED VIEW IF EXISTS klines_1h CASCADE;
        CREATE MATERIALIZED VIEW klines_1h
        WITH (timescaledb.continuous) AS
        SELECT 
            symbol,
            time_bucket('1 hour', trade_time) AS bucket,
            first(price, trade_time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, trade_time) AS close,
            sum(quantity) AS volume,
            count(*) AS trade_count
        FROM trades
        GROUP BY symbol, bucket
        WITH NO DATA;
    `);

    await pool.query(`
        DROP MATERIALIZED VIEW IF EXISTS klines_1d CASCADE;
        CREATE MATERIALIZED VIEW klines_1d
        WITH (timescaledb.continuous) AS
        SELECT 
            symbol,
            time_bucket('1 day', trade_time) AS bucket,
            first(price, trade_time) AS open,
            max(price) AS high,
            min(price) AS low,
            last(price, trade_time) AS close,
            sum(quantity) AS volume,
            count(*) AS trade_count
        FROM trades
        GROUP BY symbol, bucket
        WITH NO DATA;
    `);

    await addRefreshPolicies();
}

export async function addRefreshPolicies() {
    
    await pool.query(`
        SELECT add_continuous_aggregate_policy('klines_1m',
            start_offset => INTERVAL '1 day',
            end_offset => INTERVAL '1 minute',
            schedule_interval => INTERVAL '30 seconds',
            if_not_exists => TRUE
        );
    `);

    
    await pool.query(`
        SELECT add_continuous_aggregate_policy('klines_5m',
            start_offset => INTERVAL '7 days',
            end_offset => INTERVAL '5 minutes',
            schedule_interval => INTERVAL '2 minutes',
            if_not_exists => TRUE
        );
    `);

    
    await pool.query(`
        SELECT add_continuous_aggregate_policy('klines_1h',
            start_offset => INTERVAL '30 days',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '10 minutes',
            if_not_exists => TRUE
        );
    `);

    
    await pool.query(`
        SELECT add_continuous_aggregate_policy('klines_1d',
            start_offset => INTERVAL '365 days',
            end_offset => INTERVAL '1 day',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE
        );
    `);
}

