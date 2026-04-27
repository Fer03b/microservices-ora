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

// En local : "localhost:50052"
// En Kubernetes : "data-service:50052"
const TARGET = process.env.DATA_SERVICE_GRPC || 'localhost:50052';

const userClient = new proto.boutique.data.UserRepository(
  TARGET,
  grpc.credentials.createInsecure()
);

console.log(`[auth-service] gRPC client → ${TARGET}`);

// Helpers pour "promisifier" les appels gRPC
function createUser({ email, name, passwordHash }) {
  return new Promise((resolve, reject) => {
    userClient.createUser(
      { email, name, password_hash: passwordHash },
      (err, res) => (err ? reject(err) : resolve(res))
    );
  });
}

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    userClient.findUserByEmail({ email }, (err, res) => {
      // NOT_FOUND → on renvoie null au lieu de rejeter (cas normal)
      if (err && err.code === grpc.status.NOT_FOUND) return resolve(null);
      if (err) return reject(err);
      resolve(res);
    });
  });
}

function findUserById(id) {
  return new Promise((resolve, reject) => {
    userClient.findUserById({ id }, (err, res) => {
      if (err && err.code === grpc.status.NOT_FOUND) return resolve(null);
      if (err) return reject(err);
      resolve(res);
    });
  });
}

module.exports = { createUser, findUserByEmail, findUserById };
