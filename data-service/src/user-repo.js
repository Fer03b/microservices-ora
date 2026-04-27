const grpc = require('@grpc/grpc-js');
const { pool } = require('./db');

async function createUser(call, callback) {
  const { email, name, password_hash } = call.request;
  try {
    const res = await pool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, password_hash`,
      [email, name, password_hash]
    );
    const u = res.rows[0];
    callback(null, { id: u.id, email: u.email, name: u.name, password_hash: u.password_hash });
  } catch (err) {
    // Violation contrainte UNIQUE sur email
    if (err.code === '23505') {
      return callback({ code: grpc.status.ALREADY_EXISTS, message: 'email already in use' });
    }
    console.error('[data-service] createUser error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function findUserByEmail(call, callback) {
  try {
    const res = await pool.query(
      `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
      [call.request.email]
    );
    if (res.rows.length === 0) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'user not found' });
    }
    const u = res.rows[0];
    callback(null, { id: u.id, email: u.email, name: u.name, password_hash: u.password_hash });
  } catch (err) {
    console.error('[data-service] findUserByEmail error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

async function findUserById(call, callback) {
  try {
    const res = await pool.query(
      `SELECT id, email, name FROM users WHERE id = $1`,
      [call.request.id]
    );
    if (res.rows.length === 0) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'user not found' });
    }
    const u = res.rows[0];
    callback(null, { id: u.id, email: u.email, name: u.name });
  } catch (err) {
    console.error('[data-service] findUserById error:', err.message);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

module.exports = { createUser, findUserByEmail, findUserById };
