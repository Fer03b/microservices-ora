const express = require('express');
const { checkAvailability } = require('./grpc-client');   // gRPC vers product-service
const {
  createOrder,
  findOrdersByUser,
  findOrderByIdForUser
} = require('./data-client');                              // gRPC vers data-service
const { requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

// POST /orders — crée une commande (protégé par JWT)
app.post('/orders', requireAuth, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items requis (au moins 1 ligne)' });
  }

  const lines = items.map((i) => ({
    productId: parseInt(i.productId, 10),
    quantity: parseInt(i.quantity, 10) || 0
  }));

  // 1. gRPC vers product-service : validation stock + calcul prix côté source de vérité
  let check;
  try {
    check = await checkAvailability(lines);
  } catch (err) {
    console.error('[order-service] product gRPC error:', err.message);
    return res.status(502).json({ error: 'product-service indisponible (gRPC)' });
  }

  if (!check.available) {
    return res.status(409).json({ error: check.error || 'Panier invalide' });
  }

  const orderItems = check.resolvedLines.map((l) => ({
    productId: l.productId,
    name: l.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: Math.round(l.lineTotal * 100) / 100
  }));

  // 2. gRPC vers data-service : écriture atomique en Postgres
  try {
    const order = await createOrder({
      userId: req.user.id,
      items: orderItems,
      total: Math.round(check.totalPrice * 100) / 100
    });
    console.log(`[order-service] order #${order.id} for ${req.user.email} — ${order.total} €`);
    res.status(201).json(order);
  } catch (err) {
    console.error('[order-service] data gRPC error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la commande' });
  }
});

// GET /orders — commandes de l'utilisateur connecté
app.get('/orders', requireAuth, async (req, res) => {
  try {
    const orders = await findOrdersByUser(req.user.id);
    res.json(orders);
  } catch (err) {
    console.error('[order-service] findOrdersByUser error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /orders/:id
app.get('/orders/:id', requireAuth, async (req, res) => {
  try {
    const order = await findOrderByIdForUser(parseInt(req.params.id, 10), req.user.id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    console.error('[order-service] findOrderByIdForUser error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, () => {
  console.log(`[order-service] REST listening on port ${PORT}`);
});
