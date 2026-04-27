const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { initSchema, pool } = require('./db');
const userRepo = require('./user-repo');
const orderRepo = require('./order-repo');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'data.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,   // ⚠️ true : on garde snake_case (password_hash, user_id…)
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDef);
const ns = proto.boutique.data;

const GRPC_PORT = process.env.GRPC_PORT || 50052;

function startServer() {
  const server = new grpc.Server();

  // Service UserRepository
  server.addService(ns.UserRepository.service, {
    createUser: userRepo.createUser,
    findUserByEmail: userRepo.findUserByEmail,
    findUserById: userRepo.findUserById
  });

  // Service OrderRepository
  server.addService(ns.OrderRepository.service, {
    createOrder: orderRepo.createOrder,
    findOrdersByUser: orderRepo.findOrdersByUser,
    findOrderByIdForUser: orderRepo.findOrderByIdForUser
  });

  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err) => {
      if (err) {
        console.error('[data-service] gRPC bind error:', err);
        process.exit(1);
      }
      console.log(`[data-service] gRPC listening on port ${GRPC_PORT}`);
    }
  );
}

// Démarrage : on attend que la DB soit prête
async function start() {
  try {
    await initSchema();
    startServer();
  } catch (err) {
    console.error('[data-service] fatal: cannot init DB', err);
    process.exit(1);
  }
}

// Arrêt propre : fermer les connexions
process.on('SIGTERM', async () => {
  console.log('[data-service] SIGTERM received, shutting down');
  await pool.end();
  process.exit(0);
});

start();
