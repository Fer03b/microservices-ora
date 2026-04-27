const grpc = require('@grpc/grpc-js');
const { pool } = require('./db');

// Conversion row Postgres → objet Order du contrat proto
function row2order(orderRow, itemRows) {
  return {
    id: orderRow.id,
    user_id: orderRow.user_id,
    total: Number(orderRow.total),
    status: orderRow.status,
    created_at: orderRow.created_at instanceof Date
      ? orderRow.created_at.toISOString()
      : String(orderRow.created_at),
    items: itemRows.map((it) => ({
      product_id: it.product_id,
      name: it.name,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total)
    }))
  };
}

// Création atomique : BEGIN → INSERT orders → INSERT order_items × N → COMMIT
async function createOrder(call, callback) {
  const { user_id, total, items } = call.request;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total, status)
       VALUES ($1, $2, 'CONFIRMED')
       RETURNING id, user_id, total, status, created_at`,
      [user_id, total]
    );
    const order = orderRes.rows[0];

    const itemRows = [];
    for (const it of items) {
      const r = await client.query(
        `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING product_id, name, quantity, unit_price, line_total`,
        [order.id, it.product_id, it.name, it.quantity, it.unit_price, it.line_total]
      );
      itemRows.push(r.rows[0]);
    }

    await client.query('COMMIT');
    callback(null, row2order(order, itemRows));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[data-service] createOrder error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  } finally {
    client.release();
  }
}

async function findOrdersByUser(call, callback) {
  try {
    const ordersRes = await pool.query(
      `SELECT id, user_id, total, status, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY id DESC`,
      [call.request.user_id]
    );

    if (ordersRes.rows.length === 0) {
      return callback(null, { orders: [] });
    }

    const orderIds = ordersRes.rows.map((o) => o.id);
    const itemsRes = await pool.query(
      `SELECT order_id, product_id, name, quantity, unit_price, line_total
       FROM order_items
       WHERE order_id = ANY($1::int[])`,
      [orderIds]
    );

    const itemsByOrder = new Map();
    for (const it of itemsRes.rows) {
      if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
      itemsByOrder.get(it.order_id).push(it);
    }

    const orders = ordersRes.rows.map((o) => row2order(o, itemsByOrder.get(o.id) || []));
    callback(null, { orders });
  } catch (err) {
    console.error('[data-service] findOrdersByUser error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function findOrderByIdForUser(call, callback) {
  const { id, user_id } = call.request;
  try {
    const orderRes = await pool.query(
      `SELECT id, user_id, total, status, created_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    if (orderRes.rows.length === 0) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'order not found' });
    }
    const itemsRes = await pool.query(
      `SELECT product_id, name, quantity, unit_price, line_total
       FROM order_items WHERE order_id = $1`,
      [id]
    );
    callback(null, row2order(orderRes.rows[0], itemsRes.rows));
  } catch (err) {
    console.error('[data-service] findOrderByIdForUser error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

module.exports = { createOrder, findOrdersByUser, findOrderByIdForUser };
