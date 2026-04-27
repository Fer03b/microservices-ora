const express = require('express');
const { products } = require('./data');
const { startGrpcServer } = require('./grpc-server');

const app = express();
const PORT = process.env.PORT || 3000;
const GRPC_PORT = process.env.GRPC_PORT || 50051;

app.use(express.json());

// CORS simple pour le front
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'product-service' });
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.listen(PORT, () => {
  console.log(`[product-service] REST listening on port ${PORT}`);
});

// Serveur gRPC pour communication inter-services (order-service → product-service)
startGrpcServer(GRPC_PORT);
