const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'data.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

const TARGET = process.env.DATA_SERVICE_GRPC || 'localhost:50052';

const orderClient = new proto.boutique.data.OrderRepository(
  TARGET,
  grpc.credentials.createInsecure()
);

console.log(`[order-service] data gRPC client → ${TARGET}`);

function createOrder({ userId, items, total }) {
  return new Promise((resolve, reject) => {
    const request = {
      user_id: userId,
      total,
      items: items.map((i) => ({
        product_id: i.productId,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        line_total: i.lineTotal
      }))
    };
    orderClient.createOrder(request, (err, res) => {
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

function findOrdersByUser(userId) {
  return new Promise((resolve, reject) => {
    orderClient.findOrdersByUser({ user_id: userId }, (err, res) => {
      if (err) return reject(err);
      resolve((res.orders || []).map(mapOrder));
    });
  });
}

function findOrderByIdForUser(id, userId) {
  return new Promise((resolve, reject) => {
    orderClient.findOrderByIdForUser({ id, user_id: userId }, (err, res) => {
      if (err && err.code === grpc.status.NOT_FOUND) return resolve(null);
      if (err) return reject(err);
      resolve(mapOrder(res));
    });
  });
}

// Normalise le format snake_case gRPC → camelCase pour le front
function mapOrder(o) {
  return {
    id: o.id,
    userId: o.user_id,
    total: Number(o.total),
    status: o.status,
    createdAt: o.created_at,
    items: (o.items || []).map((i) => ({
      productId: i.product_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      lineTotal: Number(i.line_total)
    }))
  };
}

module.exports = { createOrder, findOrdersByUser, findOrderByIdForUser };
