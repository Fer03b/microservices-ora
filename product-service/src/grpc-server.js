const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { products } = require('./data');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'product.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

// ---- Handlers gRPC ----

// GetProduct : récupère un seul produit par ID
function getProduct(call, callback) {
  const product = products.find(p => p.id === call.request.id);
  if (!product) {
    return callback({
      code: grpc.status.NOT_FOUND,
      message: `Product ${call.request.id} not found`
    });
  }
  callback(null, product);
}

// CheckAvailability : le cœur de la logique de commande.
// Appelé par order-service pour :
//  - vérifier que tous les produits existent
//  - vérifier que le stock est suffisant
//  - calculer le prix total côté source de vérité (pas de triche via le front)
function checkAvailability(call, callback) {
  const lines = call.request.lines || [];

  if (lines.length === 0) {
    return callback(null, {
      available: false,
      totalPrice: 0,
      resolvedLines: [],
      error: 'empty cart'
    });
  }

  const resolved = [];
  let total = 0;

  for (const line of lines) {
    const product = products.find(p => p.id === line.productId);
    if (!product) {
      return callback(null, {
        available: false,
        totalPrice: 0,
        resolvedLines: [],
        error: `product ${line.productId} not found`
      });
    }
    if (line.quantity <= 0) {
      return callback(null, {
        available: false,
        totalPrice: 0,
        resolvedLines: [],
        error: `invalid quantity for product ${line.productId}`
      });
    }
    if (product.stock < line.quantity) {
      return callback(null, {
        available: false,
        totalPrice: 0,
        resolvedLines: [],
        error: `insufficient stock for product ${product.id} (${product.name})`
      });
    }
    const lineTotal = product.price * line.quantity;
    total += lineTotal;
    resolved.push({
      productId: product.id,
      name: product.name,
      quantity: line.quantity,
      unitPrice: product.price,
      lineTotal
    });
  }

  callback(null, {
    available: true,
    totalPrice: Math.round(total * 100) / 100,
    resolvedLines: resolved,
    error: ''
  });
}

function startGrpcServer(port = 50051) {
  const server = new grpc.Server();
  server.addService(proto.boutique.ProductService.service, {
    getProduct,
    checkAvailability
  });
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err) => {
      if (err) {
        console.error('[product-service] gRPC bind error:', err);
        return;
      }
      console.log(`[product-service] gRPC listening on port ${port}`);
    }
  );
}

module.exports = { startGrpcServer };
