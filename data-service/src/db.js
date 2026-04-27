const { Pool } = require('pg');

// Connexion au Postgres du cluster (ou local en dev)
const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     parseInt(process.env.PGPORT || '5432', 10),
  user:     process.env.PGUSER     || 'boutique_user',
  password: process.env.PGPASSWORD || 'boutique_pwd',
  database: process.env.PGDATABASE || 'boutiquedb',
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('[data-service] Postgres pool error:', err.message);
});

// Crée les 3 tables. Postgres peut ne pas être prêt au boot → retry.
async function initSchema(retries = 15, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id             SERIAL PRIMARY KEY,
          email          VARCHAR(255) UNIQUE NOT NULL,
          name           VARCHAR(255) NOT NULL,
          password_hash  VARCHAR(255) NOT NULL,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id          SERIAL PRIMARY KEY,
          user_id     INTEGER NOT NULL,
          total       NUMERIC(10, 2) NOT NULL,
          status      VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id          SERIAL PRIMARY KEY,
          order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          product_id  INTEGER NOT NULL,
          name        VARCHAR(255) NOT NULL,
          quantity    INTEGER NOT NULL,
          unit_price  NUMERIC(10, 2) NOT NULL,
          line_total  NUMERIC(10, 2) NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
      console.log('[data-service] DB schema ready');
      return;
    } catch (err) {
      console.warn(`[data-service] DB not ready (attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = { pool, initSchema };
