const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'product.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);

// En local : "localhost:50051"
// En Kubernetes : "product-service:50051" (DNS interne)
const TARGET = process.env.PRODUCT_SERVICE_GRPC || 'localhost:50051';

const client = new proto.boutique.ProductService(
  TARGET,
  grpc.credentials.createInsecure()
);

console.log(`[order-service] gRPC client → ${TARGET}`);

// Récupère un produit par ID
function getProduct(id) {
  return new Promise((resolve, reject) => {
    client.getProduct({ id }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

// Valide un panier auprès de product-service :
// vérifie existence + stock + calcule le prix total (source de vérité côté produit)
// Entrée : [{ productId, quantity }, ...]
// Sortie : { available, totalPrice, resolvedLines, error }
function checkAvailability(lines) {
  return new Promise((resolve, reject) => {
    client.checkAvailability({ lines }, (err, response) => {
      if (err) return reject(err);
      resolve(response);
    });
  });
}

module.exports = { getProduct, checkAvailability };
