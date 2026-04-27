// Client HTTP vers les 3 microservices.
// Le token JWT est injecté automatiquement dans les requêtes protégées.

const API = '/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---- product-service ----
export const fetchProducts = () => request('/products');
export const fetchProduct  = (id) => request(`/products/${id}`);

// ---- auth-service ----
export const login    = (email, password) => request('/auth/login',    { method: 'POST', body: { email, password } });
export const register = (email, password, name) => request('/auth/register', { method: 'POST', body: { email, password, name } });
export const me       = (token) => request('/auth/me', { token });

// ---- order-service ----
export const createOrder = (items, token) =>
  request('/orders', { method: 'POST', body: { items }, token });

export const listOrders = (token) => request('/orders', { token });
export const fetchOrder = (id, token) => request(`/orders/${id}`, { token });
